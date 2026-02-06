'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadPayAppSDK } from '@/lib/payapp';
import styles from './mypage.module.css';
import BottomSheetHandle from '../../components/BottomSheetHandle';
import Portal from '../../components/Portal';

// PayApp SDK 타입 정의
declare global {
  interface Window {
    PayApp: {
      setDefault: (key: string, value: string) => typeof window.PayApp;
      setParam: (key: string, value: string) => typeof window.PayApp;
      call: (params?: Record<string, string>) => void;
      payrequest: () => void;
      rebill: () => void;
    };
  }
}

interface UserInfo {
  email: string;
  name: string;
  phone: string;
  provider: string;
}

interface SubscriptionInfo {
  isActive: boolean;
  id?: string;
  plan?: string;
  amount?: number;
  startDate?: string;
  nextBillingDate?: string;
  endDate?: string;
  cancelled_at?: string;
  status?: string;
}

interface PaymentHistory {
  id: string;
  date: string;
  plan: string;
  amount: number;
  status: string;
  billingCycle: string;
  paymentMethod: string;
}

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ isActive: false });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordInline, setShowPasswordInline] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreements, setAgreements] = useState([false, false, false]);
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSubscriptionTerms, setShowSubscriptionTerms] = useState(false);
  const [showThirdPartyProvision, setShowThirdPartyProvision] = useState(false);
  const [isPayAppLoading, setIsPayAppLoading] = useState(false);
  const [payappLoadError, setPayappLoadError] = useState<string | null>(null);

  // Prevent background scroll when any modal or sheet is open
  useEffect(() => {
    // load PayApp SDK with retries
    let mounted = true;
    setIsPayAppLoading(true);
    loadPayAppSDK({ retries: 3, timeout: 8000 })
      .then(() => {
        if (!mounted) return;
        setIsPayAppLoaded(true);
        setIsPayAppLoading(false);
        if ((window as any).PayApp) {
          const userId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
          const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
          try {
            window.PayApp.setDefault('userid', userId);
            window.PayApp.setDefault('shopname', shopName);
          } catch (e) {
            console.warn('PayApp default set failed', e);
          }
        }
      })
      .catch((err) => {
        console.error('PayApp load failed:', err);
        if (!mounted) return;
        setIsPayAppLoaded(false);
        setIsPayAppLoading(false);
        setPayappLoadError(String(err?.message || err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const modalOpen = showPasswordInline || showRefundModal || showSubscriptionSheet || showTerms || showSubscriptionTerms || showThirdPartyProvision;
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('no-scroll');
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('no-scroll');
    };
  }, [showPasswordInline, showRefundModal, showSubscriptionSheet, showTerms, showSubscriptionTerms]);

  // Bottom sheet drag state (to match main page behavior)
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const [sheetTransitionEnabled, setSheetTransitionEnabled] = useState(true);

  const handleSheetOpen = () => setShowSubscriptionSheet(true);
  

  const handleDragStart = (clientY: number) => {
    draggingRef.current = true;
    startYRef.current = clientY;
    setSheetTransitionEnabled(false);
    setDragY(0);
  };

  const handleDrag = (clientY: number) => {
    if (!draggingRef.current) return;
    const dy = Math.max(0, clientY - startYRef.current);
    setDragY(dy);
  };

  const handleDragEnd = (clientY: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dy = Math.max(0, clientY - startYRef.current);
    const THRESHOLD = 120;
    setSheetTransitionEnabled(true);
    if (dy > THRESHOLD) {
      setShowSubscriptionSheet(false);
      setDragY(0);
    } else {
      setDragY(0);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // 결제 결과 수신 (팝업 창으로부터)
    const handlePaymentResult = (event: MessageEvent) => {
      if (event.data.type === 'paymentResult') {
        const { status, orderId, amount, message } = event.data.data;
        
        if (status === 'success') {
          // Redirect main window to success page so user sees result on the main UI
          try {
            router.push('/payment/success');
          } catch (e) {
            // fallback
            window.location.href = '/payment/success';
          }
          // Refresh subscription info and close sheet
          fetchSubscriptionInfo();
          handleSheetClose();
        } else {
          // navigate to failure page or show alert
          try {
            router.push('/payment/result?status=fail&orderId=' + encodeURIComponent(orderId || ''));
          } catch (e) {
            alert(`결제에 실패했습니다.\n${message || '다시 시도해 주세요.'}`);
          }
        }
      }
    };

    window.addEventListener('message', handlePaymentResult);

    // 사용자 정보 불러오기 (API 호출 시뮬레이션)
    fetchUserInfo();
    fetchSubscriptionInfo();
    fetchPaymentHistory();

    return () => {
      window.removeEventListener('message', handlePaymentResult);
    };
  }, [router]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('토큰이 없습니다.');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('User profile error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch user info');
      }

      const data = await response.json();
      setUserInfo(data);
    } catch (err: any) {
      console.error('사용자 정보 로드 실패:', err.message);
      setError('사용자 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }

      const response = await fetch('/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Subscription status error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch subscription info');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err: any) {
      console.error('구독 정보 로드 실패:', err.message);
      // 구독 정보는 없을 수 있으므로 기본값 유지
      setSubscription({ isActive: false });
    }
  };
  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return;
      }

      const response = await fetch('/api/payments/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment history error:', errorData);
        return;
      }

      const data = await response.json();
      setPaymentHistory(data.payments || []);
    } catch (err: any) {
      console.error('결제 내역 로드 실패:', err.message);
    }
  };
  // Pagination for payment history
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;
  const historyTotalPages = Math.max(1, Math.ceil(paymentHistory.length / historyPageSize));
  const pagedPaymentHistory = paymentHistory.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '비밀번호 변경에 실패했습니다.');
        return;
      }

      alert('비밀번호가 변경되었습니다.');
      setShowPasswordInline(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRefundRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscription/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: '사용자 요청'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || '환불 요청에 실패했습니다.');
        return;
      }

      alert(data.message || '환불 요청이 접수되었습니다.');
      setShowRefundModal(false);
      fetchSubscriptionInfo();
    } catch (err) {
      alert('환불 요청 처리 중 오류가 발생했습니다.');
    }
  };

  const handleAgreeAll = () => {
    const newValue = !agreeAll;
    setAgreeAll(newValue);
    setAgreements([newValue, newValue, newValue]);
  };

  const handleAgreement = (index: number) => {
    const newAgreements = [...agreements];
    newAgreements[index] = !newAgreements[index];
    setAgreements(newAgreements);
    setAgreeAll(newAgreements.every(a => a));
  };

  const handleSheetClose = () => {
    setShowSubscriptionSheet(false);
    setAgreeAll(false);
    setAgreements([false, false, false]);
    setDragY(0);
    setSheetTransitionEnabled(true);
  };

  const handleSubscriptionAction = async (action: 'start' | 'cancel' | 'refund' | 'renew') => {
    try {
      const token = localStorage.getItem('token');

      if (action === 'start') {
        setShowSubscriptionSheet(true);
      } else if (action === 'renew') {
        if (confirm('구독을 재갱신하시겠습니까? 다음 결제일부터 자동 결제가 재개됩니다.')) {
          const response = await fetch('/api/subscription/renew', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || '구독 재갱신에 실패했습니다.');
            return;
          }

          alert('구독이 재갱신되었습니다!');
          // 구독 정보 새로고침
          fetchSubscriptionInfo();
        }
      } else if (action === 'cancel') {
        if (confirm('구독을 취소하시겠습니까?')) {
          console.log('구독 취소 시도, subscription:', subscription);
          if (!subscription.id) {
            alert('구독 정보가 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.');
            return;
          }
          const response = await fetch('/api/subscription/cancel', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscriptionId: subscription.id })
          });

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || '구독 취소에 실패했습니다.');
            return;
          }

          alert('구독이 취소되었습니다.');
          // 구독 정보 새로고침
          fetchSubscriptionInfo();
        }
      } else if (action === 'refund') {
        setShowRefundModal(true);
      }
    } catch (err) {
      alert('작업 처리 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#dc2626', marginBottom: '20px' }}>{error}</p>
            <button
              onClick={() => router.push('/auth/login')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0051FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              로그인 페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>내정보 관리</h1>
        </div>

        {/* 개인정보 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>개인정보</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>이메일</span>
              <span className={styles.infoValue}>{userInfo?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>이름</span>
              <span className={styles.infoValue}>{userInfo?.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>전화번호</span>
              <span className={styles.infoValue}>
                {userInfo?.phone ? userInfo.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '등록된 전화번호가 없습니다'}
              </span>
            </div>
            {userInfo?.provider === 'email' && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>비밀번호</span>
                <button 
                  className={styles.changePasswordBtn}
                  onClick={() => setShowPasswordInline((s) => !s)}
                >
                  비밀번호 변경
                </button>
              </div>
            )}

            {showPasswordInline && (
              <div className={styles.inlinePasswordSection}>
                <form onSubmit={handlePasswordChange} className={styles.inlineForm}>
                  {error && <div className={styles.errorBox}>{error}</div>}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>현재 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>새 비밀번호</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => { setPasswordData({ ...passwordData, newPassword: e.target.value }); setError(''); }}
                      className={styles.input}
                      placeholder="8자 이상 입력하세요"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => { setPasswordData({ ...passwordData, confirmPassword: e.target.value }); setError(''); }}
                      className={styles.input}
                      placeholder="비밀번호를 다시 입력하세요"
                      required
                    />
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>새 비밀번호가 일치하지 않습니다.</div>
                    )}
                    {passwordData.newPassword && passwordData.newPassword.length > 0 && passwordData.newPassword.length < 8 && (
                      <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>비밀번호는 8자 이상이어야 합니다.</div>
                    )}
                  </div>

                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.cancelInlineBtn}
                      onClick={() => { setShowPasswordInline(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setError(''); }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={passwordData.newPassword.length < 8 || passwordData.newPassword !== passwordData.confirmPassword}
                    >
                      변경하기
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>계정</span>
              <button
                className={styles.deleteAccountBtn}
                onClick={() => setShowDeleteModal(true)}
                style={{color: '#000000', fontSize: '15px'}}
              >
                회원 탈퇴
              </button>
            </div>
          </div>
        </section>

        {/* 구독 정보 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>구독 정보</h2>
          <div className={styles.subscriptionCard}>
            {/* 구독중인 플랜 없음 */}
            {subscription.isActive && !subscription.plan ? (
              <>
                <div className={styles.subscriptionStatus}>
                  <span className={styles.statusBadgeInactive}>구독중인 플랜이 없습니다.</span>
                  <button className={styles.startBtn} onClick={() => handleSubscriptionAction('start')}>구독 시작</button>
                </div>
                <div className={styles.benefitList}>
                  <div className={styles.benefitItemInactive}>미이수 전액환급 보장</div>
                  <div className={styles.benefitItemInactive}>한평생 직업훈련 무료수강권</div>
                  <div className={styles.benefitItemInactive}>올케어 실습매칭 시스템</div>
                </div>
              </>
            ) : subscription.isActive ? (
              subscription.cancelled_at ? (
                <>
                  <div className={styles.subscriptionStatus}>
                    <span className={styles.statusBadge}>한평생 올케어</span>
                    <span className={styles.statusBadgeActive}>구독 종료 예정</span>
                  </div>
                  <div className={styles.subscriptionDetailsBox}>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>이용기간</span>
                      <span className={styles.detailValueCustom}>{subscription.startDate} ~ {subscription.nextBillingDate}</span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>다음 결제일</span>
                      <span className={styles.detailValueCustom} style={{ color: '#ef4444', fontWeight: 700 }}>구독 종료 예정</span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>결제 예정금액</span>
                      <span className={styles.detailValueCustom}>-</span>
                    </div>
                  </div>
                  <div className={styles.benefitTitle}>이용중인 혜택</div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>미이수 전액환급 보장</span>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>한평생 직업훈련 무료수강권</span>
                    <a
                      className={styles.detailValueCustomBtn}
                      href="https://korhrd.co.kr/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      사이트 바로가기
                    </a>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>올케어 실습매칭 시스템</span>
                    <a
                      className={styles.detailValueCustomBtn}
                      href="http://localhost:3000/matching"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      바로가기
                    </a>
                  </div>
                  <div className={styles.subWrapper}>
                    <div className={styles.subscriptionActionRow}>
                      <button className={styles.renewBtn} onClick={() => handleSubscriptionAction('renew')}>재갱신</button>
                      <button className={styles.refundBtn} onClick={() => handleSubscriptionAction('refund')}>환불 요청</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.subscriptionStatus}>
                    <span className={styles.statusBadge}>한평생 올케어</span>
                    <span className={styles.statusBadgeActive}>구독중</span>
                  </div>
                  <div className={styles.subscriptionDetailsBox}>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>이용기간</span>
                      <span className={styles.detailValueCustom}>{subscription.startDate} ~ {subscription.nextBillingDate}</span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>다음 결제일</span>
                      <span className={styles.detailValueCustom}>{subscription.nextBillingDate}</span>
                    </div>
                    <div className={styles.detailRowCustom}>
                      <span className={styles.detailLabelCustom}>결제 예정금액</span>
                      <span className={styles.detailValueCustom}>{subscription.amount?.toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className={styles.benefitTitle}>이용중인 혜택</div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>미이수 전액환급 보장</span>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>한평생 직업훈련 무료수강권</span>
                    <a
                      className={styles.detailValueCustomBtn}
                      href="https://korhrd.co.kr/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      사이트 바로가기
                    </a>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>올케어 실습매칭 시스템</span>
                    <a
                      className={styles.detailValueCustomBtn}
                      href="http://localhost:3000/matching"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      바로가기
                    </a>
                  </div>
                  <div className={styles.subWrapper}>
                    <div className={styles.subscriptionActionRow}>
                      <button className={styles.cancelBtn} onClick={() => handleSubscriptionAction('cancel')}>구독 취소</button>
                      <button className={styles.refundBtn} onClick={() => handleSubscriptionAction('refund')}>환불 요청</button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
                <div className={styles.benefitTitles} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'}}>
                  구독중인 플랜이 없습니다.
                  <button className={styles.startBtnSmall} onClick={() => handleSubscriptionAction('start')}>구독 시작</button>
                </div>
                <div className={styles.subscriptionMessages}>올케어 구독으로 더 많은 혜택을 받아보세요!</div>
                <div className={styles.benefitList}>
                        <div className={styles.detailRowCustom} style={{margin: '0px', padding: '0px'}}>
                      <span className={styles.benefitItemInactive}>미이수 전액환급 보장</span>
                      <span className={styles.benefitItemInactive}>보장중 </span>
                    </div>
                  <div className={styles.benefitItemInactive}>한평생 직업훈련 무료수강권</div>
                  <div className={styles.benefitItemInactive}>올케어 실습매칭 시스템</div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 결제 내역 섹션 */}
        <section className={styles.section}>
            <div className={styles.paymentHeader}>
          <h2 className={styles.sectionTitle}>결제 내역</h2>
          <button className={styles.moreBtn} onClick={() => router.push('/payment/history')}>더보기</button>
</div>
          <div className={styles.paymentHistoryCard}>
            {paymentHistory.length > 0 ? (
              <div className={styles.paymentTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>결제일</th>
                      <th>플랜</th>
                      <th>금액</th>
                      <th>결제방법</th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPaymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.date).toLocaleDateString('ko-KR')}</td>
                        <td>{payment.plan === 'premium' ? '올케어' : payment.plan}</td>
                        <td>{payment.amount.toLocaleString()}원</td>
                        <td>{payment.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Matching-style Pagination controls */}
                {paymentHistory.length > historyPageSize && (
                  <div className={styles.pagination}>
                    {historyPage > 1 && (
                      <button className={styles.pageButton} onClick={() => setHistoryPage(historyPage - 1)}>
                        <svg className={styles.pageArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(180deg)' }}>
                          <path d="M5.45848 1.79279C5.27101 1.98031 5.16569 2.23462 5.16569 2.49979C5.16569 2.76495 5.27101 3.01926 5.45848 3.20679L10.4085 8.15679L5.45848 13.1068C5.27632 13.2954 5.17552 13.548 5.1778 13.8102C5.18008 14.0724 5.28525 14.3232 5.47066 14.5086C5.65607 14.694 5.90688 14.7992 6.16908 14.8015C6.43127 14.8037 6.68387 14.7029 6.87248 14.5208L12.5295 8.86379C12.7169 8.67626 12.8223 8.42195 12.8223 8.15679C12.8223 7.89162 12.717 7.63731 12.5295 7.44979L6.87248 1.79279C6.68495 1.60532 6.43064 1.5 6.16548 1.5C5.90031 1.5 5.64601 1.60532 5.45848 1.79279Z" fill="#919191"/>
                        </svg>
                      </button>
                    )}

                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(paymentHistory.length / historyPageSize));
                      const maxVisible = 4;
                      let startPage = Math.max(1, historyPage - Math.floor(maxVisible / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                      if (endPage - startPage + 1 < maxVisible) {
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                        <button
                          key={page}
                          className={page === historyPage ? styles.pageButtonActive : styles.pageButton}
                          onClick={() => setHistoryPage(page)}
                        >
                          {page}
                        </button>
                      ));
                    })()}

                    {historyPage < Math.ceil(paymentHistory.length / historyPageSize) && (
                      <button className={styles.pageButton} onClick={() => setHistoryPage(historyPage + 1)}>
                        <svg className={styles.pageArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M5.45848 1.79279C5.27101 1.98031 5.16569 2.23462 5.16569 2.49979C5.16569 2.76495 5.27101 3.01926 5.45848 3.20679L10.4085 8.15679L5.45848 13.1068C5.27632 13.2954 5.17552 13.548 5.1778 13.8102C5.18008 14.0724 5.28525 14.3232 5.47066 14.5086C5.65607 14.694 5.90688 14.7992 6.16908 14.8015C6.43127 14.8037 6.68387 14.7029 6.87248 14.5208L12.5295 8.86379C12.7169 8.67626 12.8223 8.42195 12.8223 8.15679C12.8223 7.89162 12.717 7.63731 12.5295 7.44979L6.87248 1.79279C6.68495 1.60532 6.43064 1.5 6.16548 1.5C5.90031 1.5 5.64601 1.60532 5.45848 1.79279Z" fill="#919191"/>
                        </svg>
                      </button>
                    )}

                    {historyPage < Math.ceil(paymentHistory.length / historyPageSize) && (
                      <button className={styles.pageButton} onClick={() => setHistoryPage(Math.ceil(paymentHistory.length / historyPageSize))}>
                        <svg className={styles.pageArrow} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2.99902 1.5C3.26413 1.5 3.51854 1.60557 3.70605 1.79297L9.36328 7.4502C9.55068 7.63771 9.65625 7.89212 9.65625 8.15723C9.65613 8.42223 9.55065 8.67683 9.36328 8.86426L3.70605 14.5205C3.51746 14.7026 3.26509 14.804 3.00293 14.8018C2.74083 14.7994 2.49005 14.6941 2.30469 14.5088C2.11936 14.3235 2.01409 14.0726 2.01172 13.8105C2.00944 13.5484 2.10987 13.295 2.29199 13.1064L7.24219 8.15723L2.29199 3.20703C2.10464 3.01956 2.00006 2.76503 2 2.5C2 2.23499 2.10472 1.98047 2.29199 1.79297C2.47942 1.6056 2.73402 1.50012 2.99902 1.5ZM7.99902 1.5C8.26413 1.5 8.51854 1.60557 8.70605 1.79297L14.3633 7.4502C14.5507 7.63771 14.6562 7.89212 14.6562 8.15723C14.6561 8.42223 14.5506 8.67683 14.3633 8.86426L8.70605 14.5205C8.51746 14.7026 8.26509 14.804 8.00293 14.8018C7.74083 14.7994 7.49005 14.6941 7.30469 14.5088C7.11936 14.3235 7.01409 14.0726 7.01172 13.8105C7.00944 13.5484 7.10987 13.295 7.29199 13.1064L12.2422 8.15723L7.29199 3.20703C7.10464 3.01956 7.00006 2.76503 7 2.5C7 2.23499 7.10472 1.98047 7.29199 1.79297C7.47942 1.6056 7.73402 1.50012 7.99902 1.5Z" fill="#919191"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.emptyMessage}>결제 내역이 없습니다.</p>
            )}
          </div>
        </section>


      </div>

      

      {/* 회원 탈퇴 모달 */}
      {showDeleteModal && (
        <Portal>
          <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)} />
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowDeleteModal(false)}
            >
              ×
            </button>
            <div className={styles.modalTitle}>회원 탈퇴</div>
            <div className={styles.modalBody}>
              <p>계정을 삭제하면 복구할 수 없습니다. 관련 구독/결제 정보가 제거되며, 제공된 혜택은 소급 환불되지 않습니다.</p>
              {userInfo?.provider === 'email' ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>현재 비밀번호</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={styles.input}
                    placeholder="비밀번호를 입력하세요"
                  />
                </div>
              ) : (
                <p>소셜 로그인 계정은 소셜 제공자에서 연결을 해제한 후 삭제가 가능합니다.</p>
              )}
              {deleteError && <div className={styles.errorBox}>{deleteError}</div>}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={async () => {
                  setDeleteError('');
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                      setDeleteError('인증 정보가 없습니다. 다시 로그인해주세요.');
                      return;
                    }

                    const payload: any = (() => {
                      try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
                    })();

                    if (payload.provider === 'email' && !deletePassword) {
                      setDeleteError('비밀번호를 입력하세요.');
                      return;
                    }

                    const response = await fetch('/api/user/delete', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ password: deletePassword })
                    });

                    const data = await response.json();
                    if (!response.ok) {
                      setDeleteError(data.error || '계정 삭제에 실패했습니다.');
                      return;
                    }

                    // 성공하면 로컬 세션 정리하고 홈으로 이동
                    localStorage.removeItem('token');
                    window.dispatchEvent(new Event('authChange'));
                    alert(data.message || '계정이 삭제되었습니다. 이용해 주셔서 감사합니다.');
                    router.push('/');
                  } catch (err) {
                    console.error('Delete account error:', err);
                    setDeleteError('계정 삭제 중 오류가 발생했습니다.');
                  }
                }}
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* 환불 정책 안내 모달 */}
      {showRefundModal && (
        <Portal>
          <div className={styles.modalOverlay} onClick={() => setShowRefundModal(false)} />
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalCloseBtn}
              onClick={() => setShowRefundModal(false)}
            >
              ×
            </button>
            <div className={styles.modalTitle}>환불 정책 안내</div>
            <div className={styles.refundPolicyContent}>
             
<div className={styles.policySection}>
  <h4>청약철회 제한 (필독)</h4>
  <p className={styles.policyNotice}>
    본 상품은 결제 즉시 혜택이 부여되는 디지털 콘텐츠로, 아래 <strong>[이용 간주 기준]</strong> 중 하나라도 해당하는 경우 전자상거래법에 의거하여 <strong>환불 및 청약철회가 절대 불가능</strong>합니다.
  </p>
  <ul className={styles.policyList}>
    <li>• <strong>혜택 적용:</strong> 학점은행제 수강신청 시 구독 회원 할인을 적용받은 경우</li>
    <li>• <strong>정보 열람:</strong> 실습 매칭 시스템에 접속하여 상세 정보를 1회 이상 확인한 경우</li>
    <li>• <strong>권한 사용:</strong> 직업훈련 수강권(쿠폰 번호 등)을 조회하거나 발급받은 경우</li>
  </ul>
</div>

<div className={styles.policySection}>
  <h4>환불 및 중도 해지 규정</h4>
  <ul className={styles.policyList}>
    <li>
      <strong>서비스 개시 기준:</strong> 본 서비스는 결제 완료와 동시에 '할인 권한' 및 '정보 접근권'이 즉시 부여되므로, 시스템상 <strong>서비스 제공이 완료된 것으로 간주</strong>합니다.
    </li>
    <li>
      <strong>중도 해지 시 정산:</strong> 환불 가능 대상(미이용자)이라 하더라도 중도 해지 시에는 <strong>[제공된 서비스의 정가 차액]</strong> 및 대행 수수료를 공제한 후 정산됩니다.
    </li>
    <li>
      <strong>할인 혜택 회수:</strong> 1년 구독을 전제로 제공된 혜택이므로, 중도 해지 시에는 이미 적용받은 수강료 할인분(정상가 - 할인가)을 전액 환불 금액에서 차감하며, 차감액이 결제 금액을 초과할 경우 환불되지 않습니다.
    </li>
  </ul>
</div>

  
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setShowRefundModal(false)}
              >
                취소
              </button>
              <button 
                type="button" 
                className={styles.refundConfirmBtn}
                onClick={handleRefundRequest}
              >
                환불 요청하기
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* 구독 시트 모달 */}
      {showSubscriptionSheet && (
        <>
          <div className={styles.modalOverlay} onClick={handleSheetClose} />
          <div className={`${styles.subscribeSheet} ${sheetTransitionEnabled ? styles.withTransition : styles.dragging}`} style={{ transform: `translateX(-50%) translateY(${dragY}px)` }}>
            <div className={styles.sheetHandleContainer}>
              <BottomSheetHandle
                ariaLabel="구독 시트 핸들"
                hint=""
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
            </div>
            <div className={styles.sheetTitle}>한평생 올케어 월간 이용권</div>
            <div className={styles.sheetSub}>월 <span className={styles.sheetPrice}>20,000원</span> 결제</div>
            <hr className={styles.sheetDivider} />
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeAll}>모두 동의합니다.</span>
              <span
                className={`${styles.sheetCheckbox} ${agreeAll ? styles.sheetCheckboxChecked : ''}`}
                onClick={handleAgreeAll}
              >
                {agreeAll && (
                  <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </div>
            <div className={styles.sheetAgreeRow}>
              <span className={styles.sheetAgreeSub}>이용권 정기결제 동의 <span className={styles.sheetAgreeRequired}>(필수)</span></span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[0] ? styles.sheetCheckboxChecked : ''}`}
                onClick={() => handleAgreement(0)}
              >
                {agreements[0] && (
                  <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </div>

            <div className={styles.sheetAgreeRow}>
              <span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowTerms(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTerms(true); }}
                >이용약관</span>
                <span className={styles.sheetAgreeAnd}> 및 </span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowSubscriptionTerms(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowSubscriptionTerms(true); }}
                >결제 및 구독 유의사항</span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[1] ? styles.sheetCheckboxChecked : ''}`}
                onClick={() => handleAgreement(1)}
              >
                {agreements[1] && (
                  <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </div>

            <div className={styles.sheetAgreeRow}>
              <span>
                <span className={styles.sheetAgreeUnderline}>멤버십 제3자 개인정보 제공</span>
                <span
                  className={styles.sheetAgreeUnderline}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowThirdPartyProvision(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowThirdPartyProvision(true); }}
                >멤버십 제3자 개인정보 제공</span>
                <span className={styles.sheetAgreeRequired}> (필수)</span>
              </span>
              <span
                className={`${styles.sheetCheckbox} ${agreements[2] ? styles.sheetCheckboxChecked : ''}`}
                onClick={() => handleAgreement(2)}
              >
                {agreements[2] && (
                  <svg className={styles.sheetCheckIcon} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.07976 1.91662C8.18521 2.0221 8.24445 2.16515 8.24445 2.31431C8.24445 2.46346 8.18521 2.60651 8.07976 2.71199L3.86364 6.92812C3.80792 6.98385 3.74177 7.02806 3.66896 7.05822C3.59616 7.08838 3.51813 7.1039 3.43932 7.1039C3.36052 7.1039 3.28249 7.08838 3.20968 7.05822C3.13688 7.02806 3.07073 6.98385 3.01501 6.92812L0.92026 4.83374C0.866535 4.78186 0.823683 4.71979 0.794203 4.65116C0.764723 4.58253 0.749205 4.50872 0.748556 4.43403C0.747907 4.35934 0.76214 4.28527 0.790423 4.21615C0.818706 4.14702 0.860473 4.08421 0.913288 4.0314C0.966102 3.97858 1.02891 3.93682 1.09804 3.90853C1.16716 3.88025 1.24123 3.86602 1.31592 3.86667C1.39061 3.86731 1.46442 3.88283 1.53305 3.91231C1.60168 3.94179 1.66375 3.98464 1.71563 4.03837L3.43914 5.76187L7.28401 1.91662C7.33625 1.86435 7.39827 1.82288 7.46654 1.79459C7.53481 1.7663 7.60799 1.75174 7.68189 1.75174C7.75579 1.75174 7.82896 1.7663 7.89723 1.79459C7.9655 1.82288 8.02752 1.86435 8.07976 1.91662Z" fill="#fff"/>
                  </svg>
                )}
              </span>
            </div>

            <button 
              className={`${styles.sheetButton} ${(!agreeAll || !isPayAppLoaded) ? styles.sheetButtonDisabled : ''}`} 
              disabled={!agreeAll || !isPayAppLoaded}
              title={!isPayAppLoaded ? (isPayAppLoading ? '결제 시스템을 로딩중입니다' : '결제 시스템 로딩 실패') : ''}
              onClick={async () => {
                if (!agreeAll) return;
                if (!isPayAppLoaded) {
                  alert(isPayAppLoading ? '결제 시스템을 로딩중입니다. 잠시 후 다시 시도해주세요.' : '결제 시스템 로딩에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의하세요.');
                  return;
                }

                try {
                  const token = localStorage.getItem('token');
                  if (!token || !userInfo) {
                    alert('사용자 정보를 불러올 수 없습니다.');
                    return;
                  }

                  const { name, phone } = userInfo;

                  if (!name || !phone) {
                    alert('사용자 정보(이름, 연락처)가 없습니다. 회원정보를 먼저 입력해주세요.');
                    return;
                  }

                  // localStorage에서 토큰 가져와서 user_id 추출
                  let userId = '';
                  try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.userId || '';
                  } catch (e) {
                    console.error('Token parse error:', e);
                  }

                  const baseUrl = window.location.origin;
                  const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
                  const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';

                  if (!payappUserId) {
                    alert('결제 시스템 설정 오류입니다. 관리자에게 문의하세요.');
                    return;
                  }

                  // PayApp 초기화
                  window.PayApp.setDefault('userid', payappUserId);
                  window.PayApp.setDefault('shopname', shopName);
                  
                  const now = new Date();
                  const expireDate = new Date(now);
                  expireDate.setFullYear(expireDate.getFullYear() + 1);
                  const rebillExpire = expireDate.toISOString().split('T')[0];
                  const rebillCycleMonth = now.getDate().toString();
                  const orderId = `SUBS-${userId}-${Date.now()}`;

                  // PayApp 파라미터 설정
                  window.PayApp
                    .setParam('goodname', '한평생 올케어 월 구독')
                    .setParam('price', '20000')
                    .setParam('recvphone', phone.replace(/-/g, ''))
                    .setParam('recvname', name)
                    .setParam('orderid', orderId)
                    .setParam('timestamp', Math.floor(Date.now() / 1000).toString())
                    .setParam('rebillamount', '20000')
                    .setParam('rebillexpire', rebillExpire)
                    .setParam('rebill_cycle_month', rebillCycleMonth)
                    .setParam('var1', userId)
                    .setParam('returnurl', `${baseUrl}/api/payments/result`)
                    .setParam('startpaytype', 'card')
                    .setParam('servicetype', 'BR');

                  // 정기결제용 파라미터를 메인 페이지와 동일하게 설정하고 rebill() 호출
                  window.PayApp.setParam('goodname', '한평생 올케어 월 정기구독');
                  window.PayApp.setParam('goodprice', '20000');
                  window.PayApp.setParam('recvphone', phone.replace(/-/g, ''));
                  window.PayApp.setParam('buyername', name);
                  window.PayApp.setParam('smsuse', 'n');
                  window.PayApp.setParam('rebillCycleType', 'Month');
                  window.PayApp.setParam('rebillCycleMonth', rebillCycleMonth);
                  window.PayApp.setParam('rebillExpire', rebillExpire);
                  window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
                  window.PayApp.setParam('returnurl', `${baseUrl}/payment/success`);
                  window.PayApp.setParam('var1', JSON.stringify({ orderId: `SUBS-${userId}-${Date.now()}`, userId, phone, name }));

                  console.log('Payment request (mypage):', {
                    userid: payappUserId,
                    shopname: shopName,
                    goodname: '한평생 올케어 월 정기구독',
                    goodprice: '20000',
                    buyername: name,
                    recvphone: phone,
                    rebillCycleType: 'Month',
                    rebillCycleMonth,
                    rebillExpire,
                    baseUrl
                  });

                  try {
                    window.PayApp.rebill();
                    // 시트 닫기
                    handleSheetClose();
                  } catch (e) {
                    console.error('PayApp rebill failed:', e);
                    alert('결제창을 열 수 없습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
                  }
                } catch (error) {
                  console.error('Payment error:', error);
                  alert('결제 처리 중 오류가 발생했습니다.');
                }
              }}
              >
              {!isPayAppLoaded ? (isPayAppLoading ? '결제 시스템 로딩중...' : '결제 시스템 로딩 실패') : '한평생 올케어 구독하기'}
            </button>
          </div>
        </>
      )}

      {showTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>이용약관</div>
            <div className={styles.modalBody}>
제1조 (서비스의 정의)<br/>
본 서비스는 학습자의 원활한 학위 취득 및 자격증 취득을 돕기 위해 다음의 항목을 제공하는 1년 정기 구독형 서비스입니다.<br/>
- 학점은행제 수강료 할인 및 미이수 전액환급 보장<br/>
- 한평생 직업훈련 무료수강 이용권<br/>
- 올케어 실습 매칭 시스템 이용권<br/>
<br/>
제2조 (혜택별 이행 조건 및 면책)<br/>
- 학점은행제 수강료 할인 및 미이수 전액환급 보장: 본 혜택은 한평생교육에서 지정한 학점은행제 교육기관에서 수강하는 경우에만 적용됩니다. 회사가 지정하지 않은 타 교육기관에서 개별적으로 수강한 경우에는 할인 및 환급 보장 대상에서 제외됩니다. 출석률 100% 달성 및 모든 시험(중간·기말) 응시 조건을 충족했음에도 미이수(F학점 등)가 발생한 경우에 한해 보장됩니다.<br/>
- 한평생 직업훈련 무료수강 이용권: 한평생교육은 한평생직업훈련 무료수강 이용권을 제공하며, 학습자는 직접 외부 사이트에 가입 후 이를 등록해야 합니다. 수강료 외 자격증 발급비 등 행정 수수료는 본인 부담입니다.<br/>
- 실습 매칭 시스템 이용권: 한평생교육은 전국의 실습처 정보를 분류하여 제공하는 '정보 제공자'의 역할을 수행합니다.<br/>
            </div>
          </div>
        </>
      )}

      {showSubscriptionTerms && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowSubscriptionTerms(false)} />
          <div className={styles.modalContent}>
            <button className={styles.modalCloseBtn} onClick={() => setShowSubscriptionTerms(false)}>&times;</button>
            <div className={styles.modalTitle}>구독 및 결제 안내</div>
         <div className={styles.modalBody}>
  <strong>[구독 및 결제 안내]</strong><br/>
  • 본 상품은 <strong>1년 정기 구독 상품</strong>으로, 최초 가입일 기준 1년마다 자동 정기 결제가 발생합니다.<br/>
  • 결제 완료 즉시 '수강료 할인 혜택'과 '올케어 매칭 시스템 접속 권한'이 활성화됩니다.<br/>
  <br/>

  <strong>[환불 및 해지 유의사항 - 필독]</strong><br/>
  <strong>※ 본 상품은 디지털 콘텐츠 및 열람권이 포함된 상품으로, 아래 서비스 중 하나라도 이용(진입)한 경우 전자상거래법에 따라 청약철회 및 환불이 불가능합니다.</strong><br/>
  <br/>
  • <strong>환불 불가 기준 (서비스 이용 간주):</strong><br/>
  &nbsp;&nbsp;- 학점은행제 수강신청 시 본 구독 할인 혜택을 적용받은 경우<br/>
  &nbsp;&nbsp;- <strong>실습 매칭 시스템에 접속하여 정보를 열람(클릭)한 경우</strong><br/>
  &nbsp;&nbsp;- 직업훈련 수강권(쿠폰 번호 등)을 확인하거나 발급받은 경우<br/>
  <br/>
  • <strong>중도 해지 시 정산:</strong><br/>
  &nbsp;&nbsp;- 환불 가능 대상(미이용자)이라 하더라도, 중도 해지 시에는 [제공된 서비스의 정가 환산 금액] 및 결제 수수료를 차감한 후 정산됩니다. 차감액이 결제 대금을 초과할 경우 환불액은 발생하지 않습니다.<br/>
  <br/>

  <strong>[학습자 주의 의무 및 면책]</strong><br/>
  • <strong>학습자 귀책:</strong> 실습기관 및 교육원별 공지 미숙지, 서류(선이수 증명서 등) 제출 누락, 기한 초과 등 학습자 본인의 과실로 발생한 실습 미이수 및 신청 거절에 대해 회사는 책임지지 않으며, 이를 이유로 환불을 요구할 수 없습니다.<br/>
  <br/>
  • <strong>손해배상 제한:</strong> 회사는 서비스 이용 과정에서 발생한 자격증 취득 지연, 취업 결과, 임금 손실 등 일체의 간접적·결과적 손해에 대해 배상 책임을 지지 않습니다.<br/>
  <br/>
  • <strong>별도 비용 안내:</strong> 직업훈련 수강권 이용 시 발생하는 자격증 발급 비용 등 행정 비용은 서비스 금액에 포함되어 있지 않으며, 본인 별도 부담입니다.<br/>
</div>
          </div>
        </>
      )}

      {showThirdPartyProvision && (
        <Portal>
          <div className={styles.modalOverlay} onClick={() => setShowThirdPartyProvision(false)} />
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setShowThirdPartyProvision(false)}>&times;</button>
            <div className={styles.modalTitle}>멤버십 제3자 개인정보 제공 안내</div>
            <div className={styles.modalBody}>
              <div>
                <strong>개인정보 제3자 제공 동의 안내</strong>
              </div>
              <div style={{ height: 8 }} />
              <div>
                한평생그룹은 한평생실습 멤버십 서비스 제공을 위하여 아래와 같이 개인정보를 제3자에게 제공할 수 있습니다.
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>1. 제공받는 자</strong>
                <br/>
                한평생그룹 계열사
                <br/>
                한평생실습 멤버십 운영 및 실습 연계 기관
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>2. 제공 목적</strong>
                <br/>
                한평생실습 멤버십 서비스 제공
                <br/>
                실습 과정 운영 및 관리
                <br/>
                실습 연계, 출결 관리, 안내 및 공지 사항 전달
                <br/>
                관련 행정 처리 및 고객 지원
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>3. 제공하는 개인정보 항목</strong>
                <br/>
                이름, 연락처(휴대전화번호), 이메일
                <br/>
                소속 정보, 멤버십 이용 내역
                <br/>
                실습 참여 및 이력 관련 정보
                <br/>
                ※ 서비스 제공에 필요한 최소한의 정보만 제공됩니다.
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>4. 보유 및 이용 기간</strong>
                <br/>
                멤버십 서비스 이용 기간 동안 보유·이용
                <br/>
                관련 법령에 따라 보존이 필요한 경우 해당 기간까지 보관
              </div>
              <div style={{ height: 8 }} />
              <div>
                <strong>5. 동의 거부 권리 및 불이익 안내</strong>
                <br/>
                개인정보 제3자 제공에 대한 동의를 거부할 수 있습니다.
                <br/>
                다만, 동의를 거부할 경우 한평생실습 멤버십 서비스 및 실습 연계 제공이 제한될 수 있습니다.
              </div>
            </div>
     
          </div>
        </Portal>
      )}

      {/* PayApp SDK loading handled via loadPayAppSDK util */}
    </div>
  );
}

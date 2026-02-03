'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './mypage.module.css';

interface UserInfo {
  email: string;
  name: string;
  phone: string;
  provider: string;
}

interface SubscriptionInfo {
  isActive: boolean;
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // 사용자 정보 불러오기 (API 호출 시뮬레이션)
    fetchUserInfo();
    fetchSubscriptionInfo();
    fetchPaymentHistory();
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
      setShowPasswordModal(false);
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

  const handleSubscriptionAction = async (action: 'start' | 'cancel' | 'refund' | 'renew') => {
    try {
      const token = localStorage.getItem('token');

      if (action === 'start') {
        router.push('/payment');
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
          const response = await fetch('/api/subscription/cancel', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
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
                  onClick={() => setShowPasswordModal(true)}
                >
                  비밀번호 변경
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 구독 정보 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>구독 정보</h2>
          <div className={styles.subscriptionCard}>
            {subscription.isActive ? (
              <>
                <div className={styles.subscriptionStatus}>
                  {subscription.cancelled_at ? (
                    <span className={styles.statusBadgeWarning}>구독 중 (구독취소 상태)</span>
                  ) : (
                    <span className={styles.statusBadge}>구독 중</span>
                  )}
                </div>
                <div className={styles.subscriptionDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>구독 플랜</span>
                    <span className={styles.detailValue}>{subscription.plan || '프리미엄'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>시작일</span>
                    <span className={styles.detailValue}>{subscription.startDate || '2026.01.01'}</span>
                  </div>
                  {subscription.cancelled_at ? (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>이용 가능 종료일</span>
                      <span className={styles.detailValue} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        {subscription.endDate || subscription.nextBillingDate || '-'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>다음 결제일</span>
                        <span className={styles.detailValue}>
                          {subscription.nextBillingDate || '2026.02.01'}
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>결제 예정 금액</span>
                        <span className={styles.detailValue} style={{ color: '#2563eb', fontWeight: '600' }}>
                          {subscription.amount?.toLocaleString() || '20,000'}원
                        </span>
                      </div>
                    </>
                  )}
                  {paymentHistory.length > 0 && paymentHistory[0].paymentMethod && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>등록된 결제 수단</span>
                      <div className={styles.paymentMethodInfo}>
                        <span className={styles.detailValue}>{paymentHistory[0].paymentMethod}</span>
                        <button className={styles.changePaymentBtn} onClick={() => router.push('/payment?mode=change-payment')}>
                          변경
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.subscriptionActions}>
                  {subscription.cancelled_at ? (
                    <button 
                      className={styles.renewBtn}
                      onClick={() => handleSubscriptionAction('renew')}
                    >
                      재갱신
                    </button>
                  ) : (
                    <>
                      <button 
                        className={styles.cancelBtn}
                        onClick={() => handleSubscriptionAction('cancel')}
                      >
                        구독 취소
                      </button>
                      <button 
                        className={styles.refundBtn}
                        onClick={() => handleSubscriptionAction('refund')}
                      >
                        환불 요청
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={styles.subscriptionStatus}>
                  <span className={styles.statusBadgeInactive}>구독 안 함</span>
                </div>
                <p className={styles.subscriptionMessage}>
                  프리미엄 구독으로 더 많은 혜택을 받아보세요!
                </p>
                <div className={styles.subscriptionActions}>
                  <button 
                    className={styles.startBtn}
                    onClick={() => handleSubscriptionAction('start')}
                  >
                    구독 시작하기
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 결제 내역 섹션 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>결제 내역</h2>
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
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.date).toLocaleDateString('ko-KR')}</td>
                        <td>{payment.plan}</td>
                        <td>{payment.amount.toLocaleString()}원</td>
                        <td>{payment.paymentMethod}</td>
                        <td>
                          <span className={
                            payment.status === 'active' 
                              ? styles.statusBadgeActive
                              : payment.status === 'cancel_scheduled'
                              ? styles.statusBadgeWarning
                              : payment.status === 'cancelled'
                              ? styles.statusBadgeCancelled
                              : styles.statusBadgeExpired
                          }>
                            {payment.status === 'active' ? '구독중' : 
                             payment.status === 'cancel_scheduled' ? '구독취소 상태' :
                             payment.status === 'cancelled' ? '취소됨' : '만료'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage}>결제 내역이 없습니다.</p>
            )}
          </div>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>비밀번호 변경</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className={styles.modalForm}>
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
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
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
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={styles.input}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={() => setShowPasswordModal(false)}
                >
                  취소
                </button>
                <button type="submit" className={styles.submitBtn}>
                  변경하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 환불 정책 안내 모달 */}
      {showRefundModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRefundModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>환불 정책 안내</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowRefundModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.refundPolicyContent}>
              <div className={styles.policySection}>
                <h4>환불 가능 조건</h4>
                <ul className={styles.policyList}>
                  <li>결제 후 <strong>7일 이내</strong> 환불 요청 시</li>
                  <li>서비스를 <strong>실질적으로 사용하지 않은 경우</strong></li>
                  <li>결제 오류 등 정당한 사유가 있는 경우</li>
                </ul>
              </div>

              <div className={styles.policySection}>
                <h4>환불 불가 조건</h4>
                <ul className={styles.policyList}>
                  <li>결제 후 7일이 경과한 경우</li>
                  <li>서비스를 실질적으로 이용한 경우</li>
                  <li>이미 환불 받은 이력이 있는 경우</li>
                </ul>
              </div>

              <div className={styles.policySection}>
                <h4>환불 처리 안내</h4>
                <ul className={styles.policyList}>
                  <li>환불 요청 접수 후 <strong>3~5 영업일 이내</strong> 검토</li>
                  <li>승인 시 결제 수단으로 <strong>자동 환불</strong> 처리</li>
                  <li>카드 결제의 경우 카드사 정책에 따라 2~7일 소요</li>
                </ul>
              </div>

              <div className={styles.policyWarning}>
                ⚠️ 환불 신청 시 즉시 서비스 이용이 중단됩니다.
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
        </div>
      )}
    </div>
  );
}

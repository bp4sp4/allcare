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
                    <span className={styles.detailValueCustomBtn}>사이트 바로가기</span>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>올케어 실습매칭 시스템</span>
                    <span className={styles.detailValueCustomBtn}> 바로가기</span>
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
                    <span className={styles.detailValueCustomBtn}>사이트 바로가기</span>
                  </div>
                  <div className={styles.detailRowCustom}>
                    <span className={styles.detailLabelCustom}>올케어 실습매칭 시스템</span>
                    <span className={styles.detailValueCustomBtn}> 바로가기</span>
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
                  <div className={styles.benefitItemInactive}>미이수 전액환급 보장</div>
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
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.date).toLocaleDateString('ko-KR')}</td>
                        <td>{payment.plan === 'premium' ? '올케어' : payment.plan}</td>
                        <td>{payment.amount.toLocaleString()}원</td>
                        <td>{payment.paymentMethod}</td>
                   
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
                <h4>구독 및 결제 안내</h4>
                <ul className={styles.policyList}>
                  <li>본 상품은 <strong>1년 정기 구독 상품</strong>으로, 최초 가입일 기준 1년마다 정기 결제가 발생합니다.</li>
                  <li>결제와 동시에 '수강료 할인' 및 '매칭 시스템 접속 권한'이 부여됩니다.</li>
                </ul>
              </div>

              <div className={styles.policySection}>
                <h4>청약철회 제한 - 필독</h4>
                <ul className={styles.policyList}>
                  <li>결제 후 아래 서비스 중 하나라도 이용한 경우, 디지털 컨텐츠 이용이 개시된 것으로 간주하여 <strong>환불 및 청약철회가 불가능</strong>합니다.</li>
                  <li>학점은행제 수강신청 시 할인 혜택을 적용받은 경우</li>
                  <li>실습 매칭 시스템에 접속하여 정보를 열람한 경우</li>
                  <li>직업훈련 수강권(쿠폰 번호)을 확인하거나 발급받은 경우</li>
                </ul>
              </div>

              <div className={styles.policySection}>
                <h4>제3조 (환불 및 중도 해지)</h4>
                <ul className={styles.policyList}>
                  <li><strong>서비스 개시:</strong> 본 서비스는 결제 즉시 '수강료 할인 혜택' 및 '정보 열람 권한'이 부여되므로, 결제 완료 시 서비스 이용이 개시된 것으로 간주합니다.</li>
                  <li><strong>중도 해지 시 공제:</strong> 환불 가능 대상일지라도 중도 해지 시에는 위약금과 수강료 할인 차액을 차감한 후 정산됩니다.</li>
                  <li><strong>할인 회수:</strong> 1년 구독을 조건으로 제공된 혜택이므로, 중도 해지 시 이미 적용받은 수강료 할인 차액(정상가 - 할인가)을 공제한 후 잔여 금액을 환불합니다.</li>
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

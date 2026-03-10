'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin-dashboard.module.css';

interface UserData {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  provider: string;
  registered_at: string;
  subscription_status: string | null;
  plan: string | null;
  amount: number | null;
  next_billing_date: string | null;
  cancelled_at: string | null;
  practice_matching_access: boolean;
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // 구독 상태 변경 모달
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'cancel_scheduled' | 'cancelled'>('active');

  // 탭
  const [activeTab, setActiveTab] = useState<'users' | 'payments'>('users');
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const paymentsPageSize = 10;

  // 단과반 결제 요청 모달
  const [showCustomPayModal, setShowCustomPayModal] = useState(false);
  const [customPayUser, setCustomPayUser] = useState<UserData | null>(null);
  const [customPayForm, setCustomPayForm] = useState({ subject: '', subjectCount: '1', amount: '', memo: '' });
  const [customPayLoading, setCustomPayLoading] = useState(false);
  const [customPayRequests, setCustomPayRequests] = useState<any[]>([]);
  const [customPayModalTab, setCustomPayModalTab] = useState<'history' | 'new'>('history');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading === false) {
      fetchUsers();
    }
  }, [searchTerm, providerFilter, subscriptionFilter]);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin/login');
      return;
    }
    
    setLoading(false);
    fetchUsers();
    fetchStats();
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (providerFilter !== 'all') params.append('provider', providerFilter);
      if (subscriptionFilter !== 'all') params.append('subscription', subscriptionFilter);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }
        throw new Error('회원 목록을 불러오지 못했습니다.');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('통계 로드 실패:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  const handleReset = () => {
    setSearchTerm('');
    setProviderFilter('all');
    setSubscriptionFilter('all');
    setCurrentPage(1);
  };

  const openModal = (user: UserData) => {
    setSelectedUser(user);
    // 현재 상태 설정
    if (user.cancelled_at) {
      setNewStatus('cancel_scheduled');
    } else if (user.subscription_status === 'active') {
      setNewStatus('active');
    } else {
      setNewStatus('cancelled');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setNewStatus('active');
  };

  const handleAccessToggle = async (user: UserData) => {
    const newAccess = !user.practice_matching_access;
    const confirmMsg = newAccess
      ? `${user.name || user.email}에게 실습매칭 열람권을 부여하시겠습니까?`
      : `${user.name || user.email}의 실습매칭 열람권을 회수하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/users/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.user_id, access: newAccess }),
      });

      if (!response.ok) throw new Error('변경에 실패했습니다.');
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  const openCustomPayModal = async (user: UserData) => {
    setCustomPayUser(user);
    setCustomPayForm({ subject: '', subjectCount: '1', amount: '', memo: '' });
    setCustomPayRequests([]);
    setCustomPayModalTab('history');
    setShowCustomPayModal(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/custom-payment?userId=${user.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCustomPayRequests(d.data || []);
      }
    } catch {}
  };

  const handleCancelCustomPayRequest = async (id: string) => {
    if (!confirm('이 결제 요청을 취소하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/custom-payment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setCustomPayRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'cancelled' } : r));
    } catch {
      alert('취소에 실패했습니다.');
    }
  };

  const handleCustomPaySubmit = async () => {
    if (!customPayUser) return;
    if (!customPayForm.subject || !customPayForm.amount) {
      alert('과목명과 금액을 입력해주세요.');
      return;
    }
    const amount = parseInt(customPayForm.amount.replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }

    setCustomPayLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/custom-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: customPayUser.user_id,
          subject: customPayForm.subject,
          subjectCount: parseInt(customPayForm.subjectCount, 10) || 1,
          amount,
          memo: customPayForm.memo || undefined,
        }),
      });
      if (!res.ok) throw new Error('결제 요청 생성에 실패했습니다.');
      const created = await res.json();
      alert(`${customPayUser.name || customPayUser.email}에게 단과반 결제 요청이 전송되었습니다.`);
      setCustomPayForm({ subject: '', subjectCount: '1', amount: '', memo: '' });
      if (created.data) setCustomPayRequests((prev) => [created.data, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setCustomPayLoading(false);
    }
  };

  const handleSubscriptionAction = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/subscription/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('구독 상태 변경에 실패했습니다.');
      }

      const statusText = newStatus === 'active' ? '구독중' : newStatus === 'cancel_scheduled' ? '구독취소 상태' : '취소됨';
      alert(`구독 상태가 "${statusText}"로 변경되었습니다.`);
      closeModal();
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    }
  };

  const fetchPayments = async (page = 1) => {
    setPaymentsLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/payments?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setPaymentsTotal(data.total || 0);
        setPaymentsPage(page);
      }
    } catch (err) {
      console.error('결제 내역 로드 실패:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return `${amount.toLocaleString()}원`;
  };

  // 페이지네이션
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>AllCare Admin</h1>
          <span className={styles.adminBadge}>관리자</span>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          로그아웃
        </button>
      </header>

      <main className={styles.main}>
        {/* 통계 카드 */}
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>전체 회원</p>
              <h2 className={styles.statValue}>{stats.totalUsers}</h2>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>활성 구독</p>
              <h2 className={styles.statValue}>{stats.activeSubscriptions}</h2>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>취소된 구독</p>
              <h2 className={styles.statValue}>{stats.cancelledSubscriptions}</h2>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>총 매출</p>
              <h2 className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</h2>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('users')}
            className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
          >회원 관리</button>
          <button
            onClick={() => { setActiveTab('payments'); fetchPayments(1); }}
            className={`${styles.tabBtn} ${activeTab === 'payments' ? styles.tabBtnActive : ''}`}
          >결제 내역</button>
        </div>

        {/* 결제 내역 탭 */}
        {activeTab === 'payments' && (
          <>
            <div className={styles.tableContainer}>
              {paymentsLoading ? (
                <div className={styles.loading}>로딩 중...</div>
              ) : payments.length === 0 ? (
                <div className={styles.noData}>결제 내역이 없습니다.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>결제일시</th>
                      <th>이름</th>
                      <th>전화번호</th>
                      <th>결제 유형</th>
                      <th>상품명</th>
                      <th>금액</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => {
                      const orderId: string = p.order_id || '';
                      const payType = orderId.startsWith('PKG-') ? '패키지' : orderId.startsWith('CUSTOM-') ? '단과반' : '정기구독';
                      const payTypeBg = payType === '패키지' ? { background: '#EBF3FE', color: '#3182F6' } : payType === '단과반' ? { background: '#FFF8E1', color: '#E6A817' } : { background: '#E8F9F1', color: '#00A859' };
                      return (
                        <tr key={p.id}>
                          <td>{formatDate(p.approved_at || p.created_at)}</td>
                          <td style={{ fontWeight: 500, color: 'var(--toss-text-primary)' }}>{p.users?.name || '-'}</td>
                          <td>{p.users?.phone || p.customer_phone || '-'}</td>
                          <td>
                            <span className={styles.statusBadge} style={payTypeBg}>{payType}</span>
                          </td>
                          <td>{p.good_name || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{p.amount?.toLocaleString()}원</td>
                          <td>
                            <span className={`${styles.statusBadge} ${p.status === 'completed' ? styles.statusActive : styles.statusCancelled}`}>
                              {p.status === 'completed' ? '완료' : p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 결제 페이지네이션 */}
            {paymentsTotal > paymentsPageSize && (
              <div className={styles.pagination}>
                <button
                  onClick={() => fetchPayments(paymentsPage - 1)}
                  disabled={paymentsPage === 1 || paymentsLoading}
                  className={styles.pageBtn}
                >이전</button>
                {Array.from({ length: Math.ceil(paymentsTotal / paymentsPageSize) }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(paymentsTotal / paymentsPageSize) || Math.abs(p - paymentsPage) <= 2)
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i-1] === 'number' && (p as number) - (arr[i-1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...'
                      ? <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--toss-text-tertiary)' }}>···</span>
                      : <button
                          key={p}
                          onClick={() => fetchPayments(p as number)}
                          disabled={paymentsLoading}
                          className={`${styles.pageBtn} ${paymentsPage === p ? styles.active : ''}`}
                        >{p}</button>
                  )}
                <button
                  onClick={() => fetchPayments(paymentsPage + 1)}
                  disabled={paymentsPage === Math.ceil(paymentsTotal / paymentsPageSize) || paymentsLoading}
                  className={styles.pageBtn}
                >다음</button>
              </div>
            )}
          </>
        )}

        {/* 필터 + 회원목록 (users 탭) */}
        {activeTab === 'users' && (<><div className={styles.filters}>
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>검색</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이메일, 이름, 전화번호"
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>가입 경로</label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">전체</option>
                <option value="email">이메일</option>
                <option value="naver">네이버</option>
                <option value="kakao">카카오</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>구독 상태</label>
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="cancel_scheduled">구독취소 상태</option>
                <option value="cancelled">취소됨</option>
                <option value="none">구독 없음</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button onClick={fetchUsers} className={styles.searchBtn}>
              검색
            </button>
            <button onClick={handleReset} className={styles.resetBtn}>
              초기화
            </button>
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : currentUsers.length === 0 ? (
          <div className={styles.noData}>회원 데이터가 없습니다.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>이름</th>
                  <th>전화번호</th>
                  <th>가입경로</th>
                  <th>가입일</th>
                  <th>구독상태</th>
                  <th>구독플랜</th>
                  <th>다음결제일</th>
                  <th>실습매칭 열람권</th>
                  <th>단과반 결제</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.email}</td>
                    <td>{user.name || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span
                        className={`${styles.providerBadge} ${
                          user.provider === 'email'
                            ? styles.providerEmail
                            : user.provider === 'naver'
                            ? styles.providerNaver
                            : styles.providerKakao
                        }`}
                      >
                        {user.provider === 'email'
                          ? '이메일'
                          : user.provider === 'naver'
                          ? '네이버'
                          : '카카오'}
                      </span>
                    </td>
                    <td>{formatDate(user.registered_at)}</td>
                    <td>
                      {user.subscription_status === 'active' ? (
                        <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                          활성
                        </span>
                      ) : user.subscription_status === 'cancel_scheduled' ? (
                        <span className={`${styles.statusBadge} ${styles.statusCancelScheduled}`}>
                          구독취소 상태
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.statusNone}`}>
                          없음
                        </span>
                      )}
                    </td>
                    <td>{user.plan || '-'}</td>
                    <td>{formatDate(user.next_billing_date)}</td>
                    <td>
                      <button
                        onClick={() => handleAccessToggle(user)}
                        className={`${styles.accessBtn} ${user.practice_matching_access ? styles.accessEnabled : styles.accessDisabled}`}
                      >
                        {user.practice_matching_access ? '허용됨' : '미허용'}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => openCustomPayModal(user)}
                        className={styles.actionBtn}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                      >
                        결제요청
                      </button>
                    </td>
                    <td>
                      {user.subscription_status === 'active' && (
                        <button
                          onClick={() => openModal(user)}
                          className={styles.actionBtn}
                        >
                          상태변경
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={styles.pageBtn}
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`${styles.pageBtn} ${
                      currentPage === page ? styles.active : ''
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pageBtn}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}</>)}
      </main>

      {/* 단과반 결제 요청 모달 */}
      {showCustomPayModal && customPayUser && (
        <div className={styles.modal} onClick={() => setShowCustomPayModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', maxHeight: '88vh', overflowY: 'auto' }}>
            <h3 className={styles.modalTitle}>단과반 결제 요청</h3>
            <p className={styles.userEmail}>{customPayUser.name || customPayUser.email}</p>

            {/* 팝업 내 탭 */}
            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${customPayModalTab === 'new' ? styles.modalTabActive : ''}`}
                onClick={() => setCustomPayModalTab('new')}
              >
                새 요청
              </button>
              <button
                className={`${styles.modalTab} ${customPayModalTab === 'history' ? styles.modalTabActive : ''}`}
                onClick={() => setCustomPayModalTab('history')}
              >
                요청 내역 {customPayRequests.length > 0 && `(${customPayRequests.length})`}
              </button>
            </div>

            {/* 요청 내역 탭 */}
            {customPayModalTab === 'history' && (
              <div>
                {customPayRequests.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--toss-text-tertiary)', fontSize: '14px' }}>
                    아직 결제 요청이 없어요
                  </p>
                ) : (
                  customPayRequests.map((req) => (
                    <div key={req.id} className={styles.reqItem}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className={styles.reqSubject} style={{ opacity: req.status === 'cancelled' ? 0.45 : 1 }}>{req.subject}</p>
                        <p className={styles.reqMeta}>
                          {req.amount?.toLocaleString()}원 · {new Date(req.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className={`${styles.badge} ${req.status === 'pending' ? styles.badgePending : req.status === 'paid' ? styles.badgePaid : styles.badgeCancelled}`}>
                          {req.status === 'pending' ? '대기중' : req.status === 'paid' ? '결제완료' : '취소됨'}
                        </span>
                        {req.status === 'pending' && (
                          <button className={styles.reqCancelBtn} onClick={() => handleCancelCustomPayRequest(req.id)}>
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className={styles.modalActions}>
                  <button onClick={() => setShowCustomPayModal(false)} className={styles.cancelBtn} style={{ flex: 1 }}>
                    닫기
                  </button>
                </div>
              </div>
            )}

            {/* 새 요청 탭 */}
            {customPayModalTab === 'new' && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label className={styles.formLabel}>과목명 <span style={{ color: 'var(--toss-red)' }}>*</span></label>
                  <input
                    type="text"
                    value={customPayForm.subject}
                    onChange={(e) => setCustomPayForm({ ...customPayForm, subject: e.target.value })}
                    placeholder="예: 요양보호사 이론 3과목"
                    className={styles.formInput}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className={styles.formLabel}>과목 수</label>
                  <input
                    type="number"
                    min="1"
                    value={customPayForm.subjectCount}
                    onChange={(e) => setCustomPayForm({ ...customPayForm, subjectCount: e.target.value })}
                    className={styles.formInput}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label className={styles.formLabel}>결제 금액 (원) <span style={{ color: 'var(--toss-red)' }}>*</span></label>
                  <input
                    type="text"
                    value={customPayForm.amount}
                    onChange={(e) => setCustomPayForm({ ...customPayForm, amount: e.target.value })}
                    placeholder="예: 300000"
                    className={styles.formInput}
                  />
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <label className={styles.formLabel}>메모 (선택)</label>
                  <textarea
                    value={customPayForm.memo}
                    onChange={(e) => setCustomPayForm({ ...customPayForm, memo: e.target.value })}
                    placeholder="관리자 메모"
                    rows={2}
                    className={styles.formInput}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button onClick={handleCustomPaySubmit} disabled={customPayLoading} className={styles.confirmBtn}>
                    {customPayLoading ? '전송 중...' : '결제 요청 전송'}
                  </button>
                  <button onClick={() => setShowCustomPayModal(false)} className={styles.cancelBtn}>
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 구독 상태 변경 모달 */}
      {showModal && selectedUser && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>구독 상태 변경</h3>
            <p className={styles.userEmail}>
              <strong>{selectedUser.email}</strong>
            </p>
            <div className={styles.statusSelect}>
              <label className={styles.statusLabel}>변경할 상태 선택:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'active' | 'cancel_scheduled' | 'cancelled')}
                className={styles.statusDropdown}
              >
                <option value="active">구독중 (정상)</option>
                <option value="cancel_scheduled">구독취소 상태 (다음 결제일까지 유지)</option>
                <option value="cancelled">취소됨 (즉시 종료)</option>
              </select>
            </div>
            <div className={styles.statusDescription}>
              {newStatus === 'active' && '• 정상 구독 상태로 다음 결제일에 자동 결제됩니다.'}
              {newStatus === 'cancel_scheduled' && '• 다음 결제일까지 서비스 이용 가능하며, 자동 결제되지 않습니다.'}
              {newStatus === 'cancelled' && '• 즉시 구독이 종료되며 서비스 이용이 불가능합니다.'}
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleSubscriptionAction} className={styles.confirmBtn} style={{ background: '#E6A817' }}>
                변경
              </button>
              <button onClick={closeModal} className={styles.cancelBtn}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

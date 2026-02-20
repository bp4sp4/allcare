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
  const itemsPerPage = 20;
  
  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'cancel_scheduled' | 'cancelled'>('active');

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

        {/* 필터 */}
        <div className={styles.filters}>
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
        )}
      </main>

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
              <button onClick={handleSubscriptionAction} className={styles.confirmBtn}>
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

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
  const [modalAction, setModalAction] = useState<'activate' | 'cancel' | null>(null);

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

  const openModal = (user: UserData, action: 'activate' | 'cancel') => {
    setSelectedUser(user);
    setModalAction(action);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setModalAction(null);
  };

  const handleSubscriptionAction = async () => {
    if (!selectedUser || !modalAction) return;

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
          action: modalAction
        })
      });

      if (!response.ok) {
        throw new Error('구독 상태 변경에 실패했습니다.');
      }

      alert(`구독 상태가 ${modalAction === 'activate' ? '활성화' : '취소'}되었습니다.`);
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
                        <span
                          className={`${styles.statusBadge} ${
                            user.cancelled_at ? styles.statusCancelled : styles.statusActive
                          }`}
                        >
                          {user.cancelled_at ? '취소됨' : '활성'}
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
                      {user.subscription_status === 'active' && (
                        <button
                          onClick={() =>
                            openModal(
                              user,
                              user.cancelled_at ? 'activate' : 'cancel'
                            )
                          }
                          className={styles.actionBtn}
                        >
                          {user.cancelled_at ? '활성화' : '취소'}
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

      {/* 확인 모달 */}
      {showModal && selectedUser && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {modalAction === 'activate' ? '구독 활성화' : '구독 취소'}
            </h3>
            <p>
              <strong>{selectedUser.email}</strong> 회원의 구독을{' '}
              {modalAction === 'activate' ? '활성화' : '취소'}하시겠습니까?
            </p>
            <div className={styles.modalActions}>
              <button onClick={handleSubscriptionAction} className={styles.confirmBtn}>
                확인
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

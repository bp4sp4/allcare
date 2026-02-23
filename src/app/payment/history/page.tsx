'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './history.module.css';

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: string;
  type: 'payment' | 'refund' | 'cancellation' | 'plan_change';
  productName: string;
  paymentMethod: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string; amountPrefix: string }> = {
  payment: { label: '결제', badgeClass: 'statusBadgeSuccess', amountPrefix: '' },
  refund: { label: '환불', badgeClass: 'statusBadgeRefund', amountPrefix: '-' },
  cancellation: { label: '취소', badgeClass: 'statusBadgeCancelled', amountPrefix: '' },
  plan_change: { label: '변경', badgeClass: 'statusBadgeChange', amountPrefix: '' },
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatOrderId = (id: string) => {
    if (!id) return '';
    const cleaned = id.replace(/^ORDER-|^SUBS-|^TXN-/i, '');
    if (cleaned.length <= 12) return cleaned;
    const head = cleaned.slice(0, 8);
    const tail = cleaned.slice(-4);
    return `${head}...${tail}`;
  };

  const formatDateKST = (d: string) => {
    if (!d) return '';
    try {
      let dt: Date;
      if (/^\d+$/.test(d)) {
        const n = Number(d);
        dt = new Date(n < 1e12 ? n * 1000 : n);
      } else {
        dt = new Date(d);
      }

      if (isNaN(dt.getTime())) return d;

      return dt.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return d;
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      alert('주문번호가 복사되었습니다.');
    } catch (e) {
      console.error('Copy failed', e);
      alert('복사에 실패했습니다.');
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const res = await fetch('/api/payments/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/auth/login');
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || '결제 내역을 불러오지 못했습니다.');
        }

        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.payments || [];
        const normalized: Payment[] = list.map((p: any) => ({
          id: p.id || p.orderId || p.mulNo || p.trade_id || p.order_id || p.linkNo || '',
          date: p.date || p.paid_at || p.created_at || p.payment_date || '',
          amount: Number(p.amount || p.price || p.total || p.payamount || 0),
          status: p.status || p.result || '완료',
          type: p.type || 'payment',
          productName: p.productName || p.goodname || p.goods || '결제',
          paymentMethod: p.paymentMethod || p.payment_method || null,
        }));
        setPayments(normalized);
      } catch (e: any) {
        console.error('Payment history fetch error:', e);
        setError(e.message || '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>

          <h1 className={styles.title}>결제 내역</h1>
          <p className={styles.infoText}>결제 관련 문의는 하단에 안내된 이메일을 통해 부탁드립니다.</p>

        </div>

        {loading ? (
          <div className={styles.loading}>
            <p>로딩 중...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>📭</p>
            <p className={styles.emptyText}>결제 내역이 없습니다</p>
            <Link href="/mypage" className={styles.emptyButton}>
              첫 구독 시작하기
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {payments.map((payment) => {
              const config = TYPE_CONFIG[payment.type] || TYPE_CONFIG.payment;
              const badgeClass = styles[config.badgeClass] || styles.statusBadgeDefault;

              return (
              <div key={payment.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.productName}>{payment.productName}</span>
                  <span className={`${styles.statusBadge} ${badgeClass}`}>{config.label}</span>
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemInfo} style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <span className={styles.label}>주문번호</span>
                    <div>
                    <span className={styles.value} title={payment.id}>{formatOrderId(payment.id)}</span>
                    <button className={styles.copyBtn} onClick={() => handleCopy(payment.id)}>복사</button>
                    </div>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.label}>결제일</span>
                    <span className={styles.value}>{formatDateKST(payment.date)}</span>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.label}>금액</span>
                    <span className={`${styles.amount} ${payment.type === 'refund' ? styles.amountRefund : ''}`}>
                      {config.amountPrefix}{payment.amount.toLocaleString()}원
                    </span>
                  </div>
                  {payment.paymentMethod && (
                    <div className={styles.itemInfo}>
                      <span className={styles.label}>결제수단</span>
                      <span className={styles.value}>{payment.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

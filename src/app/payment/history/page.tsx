'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './history.module.css';

interface Payment {
  id: string;
  date: string;
  amount: number;
  status: string;
  productName: string;
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 실제 API 호출로 변경
    // 임시 데이터
    setTimeout(() => {
      setPayments([
        {
          id: 'ORDER-1738483200000',
          date: '2026-02-01',
          amount: 20000,
          status: '완료',
          productName: '구독 서비스'
        },
        {
          id: 'ORDER-1738396800000',
          date: '2026-01-01',
          amount: 20000,
          status: '완료',
          productName: '구독 서비스'
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link href="/" className={styles.backButton}>
            ← 홈으로
          </Link>
          <h1 className={styles.title}>결제 내역</h1>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <p>로딩 중...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>📭</p>
            <p className={styles.emptyText}>결제 내역이 없습니다</p>
            <Link href="/payment" className={styles.emptyButton}>
              첫 구독 시작하기
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {payments.map((payment) => (
              <div key={payment.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.productName}>{payment.productName}</span>
                  <span className={styles.statusBadge}>{payment.status}</span>
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemInfo}>
                    <span className={styles.label}>주문번호</span>
                    <span className={styles.value}>{payment.id}</span>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.label}>결제일</span>
                    <span className={styles.value}>{payment.date}</span>
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.label}>결제금액</span>
                    <span className={styles.amount}>{payment.amount.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.infoBox}>
            <h3 className={styles.infoTitle}>💡 구독 정보</h3>
            <p className={styles.infoText}>• 매월 자동 결제됩니다</p>
            <p className={styles.infoText}>• 언제든지 해지 가능합니다</p>
            <p className={styles.infoText}>• 결제 3일 전 알림을 보내드립니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}

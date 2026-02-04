'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import styles from './success.module.css';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 팝업인지 확인하고 팝업 닫기
    const isPopup = window.opener && window.opener !== window;
    
    if (isPopup) {
      // 팝업인 경우: 3초 후 자동으로 팝업 닫기
      const timer = setTimeout(() => {
        try {
          window.opener.location.reload(); // 부모 창 리로드
          window.close();
        } catch (e) {
          console.error('팝업 닫기 실패:', e);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Header />
      <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>결제 완료</h1>
        
        <p className={styles.description}>
          한평생 올케어 서비스를<br />
          지금부터 이용하실 수 있습니다.
        </p>

        <img 
          src="/images/success.png" 
          alt="결제 완료" 
          className={styles.successImage}
        />

        <div className={styles.buttonGroup}>
          <button
            className={styles.primaryButton}
            onClick={() => router.push('/')}
          >
            홈으로 돌아가기
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() => router.push('/mypage')}
          >
            결제내역 보러가기
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

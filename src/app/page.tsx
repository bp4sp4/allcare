import Link from 'next/link';
import styles from './common.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.mobileWrapper}>
        <h1 className={styles.title}>한평생올케어</h1>
        <p className={styles.subtitle}>
          정기구독 결제 시스템
        </p>

        <div className={styles.buttonGroup}>
          <Link href="/auth/login" className={styles.buttonSuccess}>
            로그인
          </Link>

          <Link href="/auth/signup" className={styles.buttonPurple}>
            회원가입
          </Link>

          <Link href="/payment" className={styles.buttonPrimary}>
            구독하기
          </Link>
          
          <Link href="/payment/history" className={styles.buttonSecondary}>
            결제내역
          </Link>
        </div>

      
      </div>
    </div>
  );
}

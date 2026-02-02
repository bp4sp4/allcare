import Link from 'next/link';
import styles from './common.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.mobileWrapper}>
        <h1 className={styles.title}>💳 한평생올케어</h1>
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

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📱 주요 기능</h2>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <span className={styles.icon}>✅</span>
              <div>
                <strong>정기구독 결제</strong> - 월 자동결제 시스템
              </div>
            </li>
            <li className={styles.listItem}>
              <span className={styles.icon}>✅</span>
              <div>
                <strong>회원가입/로그인</strong> - 이메일 인증
              </div>
            </li>
            <li className={styles.listItem}>
              <span className={styles.icon}>✅</span>
              <div>
                <strong>결제내역</strong> - 구독 관리 및 내역 확인
              </div>
            </li>
            <li className={styles.listItem}>
              <span className={styles.icon}>✅</span>
              <div>
                <strong>비밀번호 재설정</strong> - 이메일로 재설정
              </div>
            </li>
          </ul>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔌 API 엔드포인트</h2>
          <div className={styles.codeGrid}>
            <div className={styles.codeBox}>
              <code className={styles.code}>POST /api/auth/signup</code>
            </div>
            <div className={styles.codeBox}>
              <code className={styles.code}>POST /api/auth/login</code>
            </div>
            <div className={styles.codeBox}>
              <code className={styles.code}>POST /api/payments</code>
            </div>
            <div className={styles.codeBox}>
              <code className={styles.code}>GET /api/payments</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#059669' }}>POST /api/auth/login</code>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#0070f3' }}>POST /api/payments</code>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#0070f3' }}>POST /api/payments/webhook</code>
          </div>
        </div>
      </div>
    </div>
  );
}

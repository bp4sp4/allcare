import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.companyName}>한평생 올케어</div>
      
      <div className={styles.infoText}>
        이메일: all-care@korhrd.com
      </div>
      
      <div className={styles.infoText}>
        대표 양병웅 | 사업자등록번호 227-88-03196
      </div>
      
      <div className={styles.infoText}>
        서울시 도봉구 창동 미들로13길 61 씨드큐브 905호
      </div>
      
      <div className={styles.links}>
        <a href="/terms" className={styles.link}>이용약관</a>
        <span className={styles.divider}>|</span>
        <a href="/refund" className={styles.link}>환불규정</a>
        <span className={styles.divider}>|</span>
        <a href="/privacy" className={styles.link}>개인정보처리방침</a>
      </div>
      
      <div className={styles.copyright}>
        2026 © All-Care (KORHRD Partners). All rights reserved.
      </div>
    </footer>
  );
}

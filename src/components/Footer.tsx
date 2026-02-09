"use client";
import { usePathname } from 'next/navigation';
import styles from './Footer.module.css';

const HIDE_FOOTER_PATHS = [
  '/',
  '/auth/login',
  '/auth/email-login',
  '/auth/find-email',
  '/auth/reset-password',
  '/auth/signup',
  '/auth/signup/email',
];

export default function Footer({ force = false }: { force?: boolean } = {}) {
  const pathname = usePathname();

  // force=true면 경로 체크 없이 무조건 표시 (메인 page.tsx 내부용)
  if (!force) {
    if (!pathname) return null;
    if (HIDE_FOOTER_PATHS.includes(pathname)) return null;
    if (pathname.startsWith('/admin')) return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.companyName}>한평생 올케어</div>

      <div className={styles.infoText}>
        이메일: korhrdpartners@gmail.com
      </div>

      <div className={styles.infoText}>
        대표 양병웅 | 사업자등록번호 392-88-03618
      </div>

      <div className={styles.infoText}>
        서울특별시 도봉구 도봉로150다길 61, 601호(방학동, 여산빌딩)
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

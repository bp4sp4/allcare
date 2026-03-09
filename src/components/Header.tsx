'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => setUserProfile({ name: data.name || '', phone: data.phone || '' }))
        .catch(() => {});
    } else {
      setUserProfile(null);
    }
  }, [pathname]);

  const handlePackagePayment = (type: 'high' | 'college') => {
    setIsMenuOpen(false);

    if (!isPayAppLoaded || !window.PayApp) {
      alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || '';
      } catch {}
    }

    const baseUrl = window.location.origin;
    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
    const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
    const goodname = type === 'high' ? '고등학교 졸업자 패키지' : '대학교 졸업자 패키지';
    const goodprice = type === 'high' ? '1170000' : '720000';
    const orderId = `PKG-${Date.now()}`;

    window.PayApp.setDefault('userid', payappUserId);
    window.PayApp.setDefault('shopname', shopName);
    window.PayApp.setParam('goodname', goodname);
    window.PayApp.setParam('goodprice', goodprice);
    if (userProfile?.phone) window.PayApp.setParam('recvphone', userProfile.phone);
    if (userProfile?.name) window.PayApp.setParam('buyername', userProfile.name);
    window.PayApp.setParam('smsuse', 'n');
    window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
    window.PayApp.setParam('returnurl', `${baseUrl}/`);
    window.PayApp.setParam('var1', JSON.stringify({ orderId, userId, packageType: type }));
    window.PayApp.call();
  };

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <Script
        src="https://lite.payapp.kr/public/api/v2/payapp-lite.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.PayApp) {
            window.PayApp.setDefault('userid', process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '');
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어');
            setIsPayAppLoaded(true);
          }
        }}
      />

      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/logo.png"
            alt="한평생올케어"
            width={117}
            height={17}
            priority
          />
        </Link>

        <button
          className={styles.hamburger}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="메뉴"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M28.5 24C29.3284 24 30 24.6716 30 25.5C30 26.3284 29.3284 27 28.5 27H7.5C6.67157 27 6 26.3284 6 25.5C6 24.6716 6.67157 24 7.5 24H28.5ZM28.5 16.5C29.3284 16.5 30 17.1716 30 18C30 18.8284 29.3284 19.5 28.5 19.5H7.5C6.67157 19.5 6 18.8284 6 18C6 17.1716 6.67157 16.5 7.5 16.5H28.5ZM28.5 9C29.3284 9 30 9.67157 30 10.5C30 11.3284 29.3284 12 28.5 12H7.5C6.67157 12 6 11.3284 6 10.5C6 9.67157 6.67157 9 7.5 9H28.5Z" fill="#3D3D3D"/>
          </svg>
        </button>

        <nav className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
          {!isLoggedIn ? (
            <div className={styles.menuItem}>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                로그인/회원가입
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.menuItem}>
                <Link href="/mypage" onClick={() => setIsMenuOpen(false)}>
                  내정보 관리
                </Link>
              </div>
              <div className={styles.menuItem}>
                <Link href="/auth/login" onClick={() => {
                  localStorage.removeItem('token');
                  setIsLoggedIn(false);
                  setIsMenuOpen(false);
                  window.dispatchEvent(new Event('authChange'));
                }}>
                  로그아웃
                </Link>
              </div>
            </>
          )}

          <div className={styles.menuItem}>
            <button className={styles.menuBtn} onClick={() => handlePackagePayment('high')}>
              고등학교 졸업자 패키지 117만원
            </button>
          </div>
          <div className={styles.menuItem}>
            <button className={styles.menuBtn} onClick={() => handlePackagePayment('college')}>
              대학교 졸업자 패키지 72만원
            </button>
          </div>

          <div className={styles.menuItem}>
            <a href="https://korhrd.co.kr/" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)}>
              한평생직업훈련 바로가기
            </a>
          </div>
          <div className={styles.menuItem}>
            <Link href="/matching" onClick={() => setIsMenuOpen(false)}>
              올케어 실습매칭 시스템
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}

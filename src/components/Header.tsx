'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);
  const [customRequests, setCustomRequests] = useState<{ id: string; subject: string; amount: number }[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(!!localStorage.getItem('token'));
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
        .then((r) => r.json())
        .then((d) => setUserProfile({ name: d.name || '', phone: d.phone || '' }))
        .catch(() => {});

      fetch('/api/custom-payment/pending', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setCustomRequests(d.requests || []))
        .catch(() => {});
    } else {
      setUserProfile(null);
      setCustomRequests([]);
    }
  }, [pathname]);

  const handleCustomPayment = async (requestId: string) => {
    setIsMenuOpen(false);
    const token = localStorage.getItem('token');
    if (!token) { alert('로그인이 필요합니다.'); return; }

    const res = await fetch('/api/payments/request-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestId }),
    });

    const data = await res.json();
    if (!res.ok || !data.payurl) {
      alert(data.error || '결제 요청에 실패했습니다.');
      return;
    }

    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(data.payurl, 'payapp', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
  };

  const handlePackagePayment = async (type: 'high' | 'college') => {
    setIsMenuOpen(false);

    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try { userId = JSON.parse(atob(token.split('.')[1])).userId || ''; } catch {}
    }

    const res = await fetch('/api/payments/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageType: type,
        recvphone: userProfile?.phone || '',
        buyerName: userProfile?.name || '',
        userId,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.payurl) {
      alert(data.error || '결제 요청에 실패했습니다.');
      return;
    }

    const w = 480, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(data.payurl, 'payapp', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
  };

  if (pathname?.startsWith('/admin')) return null;

  return (
    <header className={styles.header} ref={headerRef}>
      <Link href="/" className={styles.logo}>
        <Image src="/logo.png" alt="메인로고" width={117} height={17} priority />
      </Link>

      <button className={styles.hamburger} onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="메뉴">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M28.5 24C29.3284 24 30 24.6716 30 25.5C30 26.3284 29.3284 27 28.5 27H7.5C6.67157 27 6 26.3284 6 25.5C6 24.6716 6.67157 24 7.5 24H28.5ZM28.5 16.5C29.3284 16.5 30 17.1716 30 18C30 18.8284 29.3284 19.5 28.5 19.5H7.5C6.67157 19.5 6 18.8284 6 18C6 17.1716 6.67157 16.5 7.5 16.5H28.5ZM28.5 9C29.3284 9 30 9.67157 30 10.5C30 11.3284 29.3284 12 28.5 12H7.5C6.67157 12 6 11.3284 6 10.5C6 9.67157 6.67157 9 7.5 9H28.5Z" fill="#3D3D3D"/>
        </svg>
      </button>

      <nav className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
        {!isLoggedIn ? (
          <div className={styles.menuItem}>
            <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>로그인/회원가입</Link>
          </div>
        ) : (
          <>
            <div className={styles.menuItem}>
              <Link href="/mypage" onClick={() => setIsMenuOpen(false)}>내정보 관리</Link>
            </div>
            <div className={styles.menuItem}>
              <Link href="/auth/login" onClick={() => {
                localStorage.removeItem('token');
                setIsLoggedIn(false);
                setIsMenuOpen(false);
                window.dispatchEvent(new Event('authChange'));
              }}>로그아웃</Link>
            </div>
          </>
        )}

        {customRequests.map((req) => (
          <div key={req.id} className={styles.menuItem}>
            <button className={`${styles.menuBtn} ${styles.menuBtnCustom}`} onClick={() => handleCustomPayment(req.id)}>
              단과반 결제 · {req.subject} ({req.amount.toLocaleString()}원)
            </button>
          </div>
        ))}

        <div className={styles.menuItem}>
          <Link href="/" onClick={() => setIsMenuOpen(false)}>사회복지사</Link>
        </div>
        <div className={styles.menuItem}>
          <Link href="/allcare" onClick={() => setIsMenuOpen(false)}>올케어 구독하기</Link>
        </div>

        <div className={styles.menuItem}>
          <a href="https://korhrd.co.kr/" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)}>한평생직업훈련 바로가기</a>
        </div>
        <div className={styles.menuItem}>
          <Link href="/matching" onClick={() => setIsMenuOpen(false)}>올케어 실습매칭 시스템</Link>
        </div>
      </nav>
    </header>
  );
}

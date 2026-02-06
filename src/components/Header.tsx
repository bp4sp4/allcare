'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 초기 로그인 상태 확인
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkAuth();

    // storage 이벤트 리스너 (다른 탭에서의 변경 감지)
    window.addEventListener('storage', checkAuth);

    // 커스텀 이벤트 리스너 (같은 탭에서의 변경 감지)
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  // pathname 변경 시에도 로그인 상태 재확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [pathname]);

  // /admin 경로에서는 헤더 숨김
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
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
                // Header에 로그아웃 상태 변경 알림
                window.dispatchEvent(new Event('authChange'));
              }}>
                로그아웃
              </Link>
            </div>
          </>
        )}
        
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
  );
}

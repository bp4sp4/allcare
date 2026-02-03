'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import styles from './common.module.css';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // URL에서 토큰 확인 (OAuth 리다이렉트)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      // URL 정리
      window.history.replaceState({}, '', '/');
    }
    
    // 로그인 상태 확인 (쿠키 또는 로컬스토리지)
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      // Supabase 로그아웃 (카카오)
      await supabase.auth.signOut();
      
      // 서버 로그아웃 API 호출 (네이버 쿠키 삭제)
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // 로컬 스토리지 토큰 삭제
      localStorage.removeItem('token');
      
      // 상태 업데이트
      setIsLoggedIn(false);
      
      alert('로그아웃 되었습니다.');
      router.push('/');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    
      <div className={styles.mobileWrapper}>
        <Header />
        
        <h1 className={styles.title}>한평생올케어</h1>
        <p className={styles.subtitle}>
          정기구독 결제 시스템
        </p>

        <div className={styles.buttonGroup}>
          {isLoggedIn ? (
            <>
              <button onClick={handleLogout} className={styles.buttonSecondary}>
                로그아웃
              </button>
              
              <Link href="/payment" className={styles.buttonPrimary}>
                구독하기
              </Link>
              
              <Link href="/payment/history" className={styles.buttonSecondary}>
                결제내역
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/signup" className={styles.buttonSuccess}>
                회원가입
              </Link>

              <Link href="/auth/login" className={styles.buttonPurple}>
                로그인
              </Link>

              <Link href="/payment" className={styles.buttonPrimary}>
                구독하기
              </Link>
              
              <Link href="/payment/history" className={styles.buttonSecondary}>
                결제내역
              </Link>
            </>
          )}
        </div>

      
      </div>
    
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSocialLogin = async (provider: 'kakao' | 'naver') => {
    try {
      if (provider === 'naver') {
        window.location.href = '/api/auth/naver';
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        setError(`${provider === 'kakao' ? '카카오' : '네이버'} 회원가입에 실패했습니다.`);
      }
    } catch (err) {
      setError('소셜 회원가입 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.container}>
        <div className={styles.logo}><img src="/logo.png" alt="한평생올케어 로고" /></div>
        <div className={styles.divider}>
          <span>회원가입</span>
        </div>
        {error && (
          <div className={styles.errorBox}>{error}</div>
        )}
        
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            SNS 회원가입
          </p>
          <div className={styles.socialButtons}>
            <button
              type="button"
              onClick={() => handleSocialLogin('kakao')}
              className={styles.kakaoButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="#3C1E1E" viewBox="0 0 21 21"><path fill="current" d="M10.5 3.217c4.514 0 8 2.708 8 6.004 0 3.758-4.045 6.184-8 5.892-1.321-.093-1.707-.17-2.101-.23-1.425.814-2.728 2.344-3.232 2.334-.325-.19.811-2.896.533-3.114-.347-.244-3.157-1.329-3.2-4.958 0-3.199 3.486-5.928 8-5.928Z"></path></svg>
              카카오로 시작하기
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('naver')}
              className={styles.naverButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21"><path fill="#fff" d="M4 16.717h4.377V9.98l4.203 6.737H17v-13h-4.377v6.737l-4.16-6.737H4v13Z"></path></svg>
              네이버로 시작하기
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            이메일 회원가입
          </p>
          <div className={styles.socialButtons}>
            <Link
              href="/auth/signup/email"
              className={styles.emailButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 20 16" fill="none"><path d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 14.55 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L2 4V14H18V4L10 9ZM10 7L18 2H2L10 7ZM2 4V2V14V4Z" fill="white"/></svg>
              이메일로 회원가입
            </Link>
          </div>
        </div>

        <div className={styles.signupWrap} style={{ marginTop: '24px' }}>
          <span>이미 계정이 있으신가요?</span>
          <Link href="/auth/login" className={styles.signupLink}>로그인</Link>
        </div>
      </div>
    </div>
  );
}

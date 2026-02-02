'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSocialLogin = async (provider: 'kakao' | 'naver') => {
    try {
      if (provider === 'naver') {
        // 네이버는 커스텀 OAuth 플로우 사용
        window.location.href = '/api/auth/naver';
        return;
      }

      // 카카오는 Supabase OAuth 사용
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setError(`${provider === 'kakao' ? '카카오' : '네이버'} 로그인에 실패했습니다.`);
      }
    } catch (err) {
      setError('소셜 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // 토큰을 로컬 스토리지에 저장
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        router.push('/');
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>한평생올케어</h1>
        <p className={styles.subtitle}>로그인하여 서비스를 이용하세요</p>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#FEE500',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>💬</span>
            카카오 로그인
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('naver')}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#03C75A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>N</span>
            네이버 로그인
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '1.5rem 0',
          gap: '0.5rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>또는</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>이메일</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>비밀번호</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.linkRow}>
            <Link href="/auth/find-email" className={styles.link}>
              이메일 찾기
            </Link>
            <Link href="/auth/reset-password" className={styles.link}>
              비밀번호 찾기
            </Link>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            계정이 없으신가요?{' '}
            <Link href="/auth/signup" className={styles.footerLink}>
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

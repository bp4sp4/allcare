'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

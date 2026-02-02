'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    verificationCode: ''
  });
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setError(`${provider === 'kakao' ? '카카오' : '구글'} 로그인에 실패했습니다.`);
      }
    } catch (err) {
      setError('소셜 로그인 중 오류가 발생했습니다.');
    }
  };

  const handleSendVerification = async () => {
    if (!formData.phone) {
      setError('전화번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerificationSent(true);
        alert('인증번호가 발송되었습니다.');
      } else {
        setError(data.error || '인증번호 발송에 실패했습니다.');
      }
    } catch (err) {
      setError('인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.verificationCode) {
      setError('인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: formData.phone,
          code: formData.verificationCode 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        alert('전화번호 인증이 완료되었습니다.');
      } else {
        setError(data.error || '인증번호가 일치하지 않습니다.');
      }
    } catch (err) {
      setError('인증 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!formData.email || !formData.password || !formData.name || !formData.phone) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isVerified) {
      setError('전화번호 인증을 완료해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('회원가입이 완료되었습니다!');
        router.push('/auth/login');
      } else {
        setError(data.error || '회원가입에 실패했습니다.');
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>회원가입</h1>
        <p className={styles.subtitle}>한평생올케어에 오신 것을 환영합니다</p>

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
            카카오로 시작하기
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: 'white',
              color: '#000000',
              border: '1px solid #dadce0',
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
            <span style={{ fontSize: '1.2rem' }}>G</span>
            구글로 시작하기
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '1.5rem 0',
          gap: '0.5rem'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>또는 이메일로 가입</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>이메일 *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>비밀번호 *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>비밀번호 확인 *</label>
            <input
              type="password"
              value={formData.passwordConfirm}
              onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>이름 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              전화번호 *
              {isVerified && <span className={styles.successBadge}>✓ 인증완료</span>}
            </label>
            <div className={styles.verificationGroup}>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01012345678"
                required
                disabled={isVerified}
                className={`${styles.input} ${styles.verificationInput}`}
                style={{ backgroundColor: isVerified ? '#f3f4f6' : 'white' }}
              />
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={loading || isVerified}
                className={styles.verificationButton}
              >
                {isVerified ? '✓ 완료' : '인증번호'}
              </button>
            </div>
          </div>

          {isVerificationSent && !isVerified && (
            <div className={styles.formGroup}>
              <label className={styles.label}>인증번호</label>
              <div className={styles.verificationGroup}>
                <input
                  type="text"
                  value={formData.verificationCode}
                  onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                  placeholder="6자리 숫자"
                  maxLength={6}
                  className={`${styles.input} ${styles.verificationInput}`}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={loading}
                  className={styles.verificationButton}
                >
                  확인
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isVerified} className={styles.submitButton}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className={styles.footerLink}>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

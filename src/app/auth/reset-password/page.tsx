'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({
    email: false
  });

  const validateEmail = (email: string) => {
    return email.includes('@');
  };

  const handleSendTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !validateEmail(email)) {
      setError('올바른 이메일을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setTempPassword(data.tempPassword);
      } else {
        setError(data.error || '임시 비밀번호 발급에 실패했습니다.');
      }
    } catch (err) {
      setError('임시 비밀번호 발급 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email && validateEmail(email);

  if (tempPassword) {
    return (
      <div className={styles.container}>
        <div className={styles.emailLoginWrap}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="한평생올케어" />
          </div>
        
          
          <div className={styles.emailResult}>
            <p className={styles.foundEmail}>{tempPassword}</p>
          </div>
          
          <p style={{
            textAlign: 'center',
            color: '#dc2626',
            fontSize: '13px',
            marginTop: '16px',
            marginBottom: '24px'
          }}>
            ⚠️ 로그인 후 반드시 비밀번호를 변경해주세요
          </p>
          
          <button
            onClick={() => router.push('/auth/login')}
            className={styles.loginButton}
            style={{ marginBottom: 0 }}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.emailLoginWrap}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="한평생올케어" />
        </div>

        <div className={styles.divider}>
          <span>비밀번호 찾기</span>
        </div>

        <form onSubmit={handleSendTempPassword}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              이메일 <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setTouched({ ...touched, email: true });
              }}
              onBlur={() => setTouched({ ...touched, email: true })}
              className={`${styles.input} ${touched.email && !validateEmail(email) ? styles.inputError : ''}`}
              placeholder="abc@gccompany.co.kr"
            />
            {touched.email && !validateEmail(email) && (
              <div className={styles.errorMessage}>올바른 이메일 형식이 아닙니다.</div>
            )}
          </div>

          {error && (
            <div className={styles.errorMessage} style={{ marginBottom: '16px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isEmailValid || loading}
            className={styles.loginButton}
          >
            {loading ? '발급 중...' : '임시 비밀번호 발급'}
          </button>
        </form>

        <div className={styles.eamildivider}>
          <div className={styles.signupWrap}>
            <span>계정이 없으신가요?</span>
            <Link href="/auth/signup" className={styles.signupLink}>
              이메일로 회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

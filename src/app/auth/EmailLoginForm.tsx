import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './auth.module.css';


interface EmailLoginFormProps {
  onSuccess?: () => void;
}

export default function EmailLoginForm({ onSuccess }: EmailLoginFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateEmail = (email: string) => {
    if (!email) return '';
    if (!email.includes('@')) {
      return '올바른 이메일 주소를 입력해 주세요.';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return '';
    if (password.length < 8) {
      return '8자 이상 입력해 주세요.';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    // 실시간으로 유효성 검사
    setEmailError(validateEmail(email));
    if (!touched.email) {
      setTouched({ ...touched, email: true });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    // 실시간으로 유효성 검사
    setPasswordError(validatePassword(password));
    if (!touched.password) {
      setTouched({ ...touched, password: true });
    }
  };

  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    setEmailError(validateEmail(formData.email));
  };

  const handlePasswordBlur = () => {
    setTouched({ ...touched, password: true });
    setPasswordError(validatePassword(formData.password));
  };

  const isFormValid = formData.email && formData.password && !emailError && !passwordError;

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
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (onSuccess) onSuccess();
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
    
    <div className={styles.emailLoginWrap}>
        
      <div className={styles.logoWrap}>
        <img src="/logo.png" alt="한평생올케어 로고" className={styles.logo} />
        
      </div>
      <div className={styles.divider}>
        <span>이메일 로그인</span>
      </div>
    
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>이메일<span className={styles.required}>*</span></label>
          <input
            id="email"
            type="text"
            placeholder="abc@gccompany.co.kr"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            className={`${styles.input} ${emailError && touched.email ? styles.inputError : ''}`}
          />
          {emailError && touched.email && (
            <div className={styles.errorMessage}>{emailError}</div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>비밀번호<span className={styles.required}>*</span></label>
          <input
            id="password"
            type="password"
            placeholder="비밀번호를 입력하세요."
            value={formData.password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            className={`${styles.input} ${passwordError && touched.password ? styles.inputError : ''}`}
          />
          {passwordError && touched.password && (
            <div className={styles.errorMessage}>{passwordError}</div>
          )}
        </div>
        <div className={styles.formActions}>
            <Link href="/auth/find-email" className={styles.resetLink}>이메일 찾기</Link>
            <div className={styles.eamildivider}>/</div>
            <Link href="/auth/reset-password" className={styles.resetLink}>비밀번호 재설정</Link>
        </div>
        <button type="submit" className={styles.loginButton} disabled={!isFormValid || loading}>로그인</button>
      </form>
      <div className={styles.signupWrap}>
        <span>계정이 없으신가요?</span>
        
        <Link href="/auth/signup" className={styles.signupLink}>이메일로 회원가입</Link>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
    </div>
  );
}

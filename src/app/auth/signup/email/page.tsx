'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from '../../auth.module.css';

export default function EmailSignupPage() {
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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    passwordConfirm: false,
    name: false,
    phone: false
  });

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

  const validatePasswordConfirm = (passwordConfirm: string) => {
    if (!passwordConfirm) return '';
    if (passwordConfirm !== formData.password) {
      return '비밀번호가 일치하지 않습니다.';
    }
    return '';
  };

  const validateName = (name: string) => {
    if (!name) return '';
    if (name.length < 2) {
      return '이름을 2자 이상 입력해 주세요.';
    }
    return '';
  };

  const validatePhone = (phone: string) => {
    if (!phone) return '';
    if (!/^01[0-9]{8,9}$/.test(phone)) {
      return '올바른 전화번호를 입력해 주세요.';
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    setEmailError(validateEmail(email));
    if (!touched.email) {
      setTouched({ ...touched, email: true });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    setPasswordError(validatePassword(password));
    if (formData.passwordConfirm) {
      setPasswordConfirmError(password !== formData.passwordConfirm ? '비밀번호가 일치하지 않습니다.' : '');
    }
    if (!touched.password) {
      setTouched({ ...touched, password: true });
    }
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const passwordConfirm = e.target.value;
    setFormData({ ...formData, passwordConfirm });
    setPasswordConfirmError(validatePasswordConfirm(passwordConfirm));
    if (!touched.passwordConfirm) {
      setTouched({ ...touched, passwordConfirm: true });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name });
    setNameError(validateName(name));
    if (!touched.name) {
      setTouched({ ...touched, name: true });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, phone });
    setPhoneError(validatePhone(phone));
    if (!touched.phone) {
      setTouched({ ...touched, phone: true });
    }
  };

  const isFormValid = 
    formData.email && 
    formData.password && 
    formData.passwordConfirm && 
    formData.name && 
    formData.phone &&
    !emailError && 
    !passwordError && 
    !passwordConfirmError && 
    !nameError && 
    !phoneError &&
    isVerified;

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
        setTimeLeft(300); // 5분 = 300초
        
        // 타이머 시작
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
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
    <div className={styles.card}>
      <div className={styles.container} style={{ marginTop: '90px' }}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="한평생올케어 로고" className={styles.logo} />
        </div>
        <div className={styles.divider}>
          <span>이메일 회원가입</span>
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
              placeholder="8자 이상 입력하세요"
              value={formData.password}
              onChange={handlePasswordChange}
              className={`${styles.input} ${passwordError && touched.password ? styles.inputError : ''}`}
            />
            {passwordError && touched.password && (
              <div className={styles.errorMessage}>{passwordError}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="passwordConfirm" className={styles.label}>비밀번호 확인<span className={styles.required}>*</span></label>
            <input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={formData.passwordConfirm}
              onChange={handlePasswordConfirmChange}
              className={`${styles.input} ${passwordConfirmError && touched.passwordConfirm ? styles.inputError : ''}`}
            />
            {passwordConfirmError && touched.passwordConfirm && (
              <div className={styles.errorMessage}>{passwordConfirmError}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>이름<span className={styles.required}>*</span></label>
            <input
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              value={formData.name}
              onChange={handleNameChange}
              className={`${styles.input} ${nameError && touched.name ? styles.inputError : ''}`}
            />
            {nameError && touched.name && (
              <div className={styles.errorMessage}>{nameError}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.label}>
              휴대폰 번호<span className={styles.required}>*</span>
              {isVerified && <span className={styles.successBadge}>✓ 인증완료</span>}
            </label>
            <div className={styles.verificationGroup}>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="01012345678"
                disabled={isVerified}
                className={`${styles.input} ${styles.verificationInput} ${phoneError && touched.phone ? styles.inputError : ''}`}
                style={{ backgroundColor: isVerified ? '#f3f4f6' : 'white' }}
              />
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={loading || isVerified || !!phoneError || (isVerificationSent && timeLeft > 0)}
                className={styles.sendVerificationButton}
              >
                {isVerified ? '✓ 완료' : (isVerificationSent && timeLeft > 0) ? '재전송' : '인증번호 전송'}
              </button>
            </div>
            {phoneError && touched.phone && !isVerified && (
              <div className={styles.errorMessage}>{phoneError}</div>
            )}
          </div>

          {isVerificationSent && !isVerified && (
            <div className={styles.formGroup}>
              <label htmlFor="verificationCode" className={styles.label}>
                인증번호
                {timeLeft > 0 && (
                  <span className={styles.timerText}> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                )}
              </label>
              <div className={styles.verificationGroup}>
                <input
                  id="verificationCode"
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

          <button type="submit" disabled={!isFormValid || loading} className={styles.loginButton}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div className={styles.signupWrap}>
          <span>이미 계정이 있으신가요?</span>
          <Link href="/auth/login" className={styles.signupLink}>로그인</Link>
        </div>
        {error && <div className={styles.errorBox}>{error}</div>}
      </div>
    </div>
  );
}

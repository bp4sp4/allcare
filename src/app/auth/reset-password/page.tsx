'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AlertModal from '@/components/AlertModal';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    phone: false,
    verificationCode: false
  });

  const validateEmail = (email: string) => {
    return email.includes('@');
  };

  const validatePhone = (phone: string) => {
    return /^01[0-9]{8,9}$/.test(phone);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // require email and phone verification
    if (!email || !validateEmail(email)) {
      setError('올바른 이메일을 입력해주세요.');
      setShowErrorModal(true);
      return;
    }

    if (!phone || !validatePhone(phone)) {
      setError('올바른 전화번호를 입력해주세요.');
      setShowErrorModal(true);
      return;
    }

    if (!isVerified) {
      setError('전화번호 인증을 완료해주세요.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone })
      });

      const data = await response.json();

      if (response.ok) {
        setTempPassword(data.tempPassword);
      } else {
        setError(data.error || '임시 비밀번호 발급에 실패했습니다.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setError('임시 비밀번호 발급 중 오류가 발생했습니다.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerification = async () => {
    if (!phone) {
      setError('전화번호를 입력해주세요.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerificationSent(true);
        setTimer(300);

        const countdown = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setError('인증번호가 발송되었습니다.');
        setShowErrorModal(true);
      } else {
        setError(data.error || '인증번호 발송에 실패했습니다.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setError('인증번호 발송 중 오류가 발생했습니다.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('인증번호를 입력해주세요.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        setError('전화번호 인증이 완료되었습니다.');
        setShowErrorModal(true);
      } else {
        setError(data.error || '인증번호가 일치하지 않습니다.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setError('인증 확인 중 오류가 발생했습니다.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email && validateEmail(email);

  if (tempPassword) {
    return (
      <>
        {showErrorModal && (
          <AlertModal
            message={error}
            onClose={() => setShowErrorModal(false)}
          />
        )}
        <div className={styles.container}>
        <div className={styles.emailLoginWrap}>

        
          
          <div className={styles.emailResult}>
            <p className={styles.foundEmail}>
              사용자님의 임시 비밀번호는 <span className={styles.successEmail}>{tempPassword}</span>입니다. </p>
          </div>
          
          <p style={{
            textAlign: 'center',
            color: '#FF3A3A',
            fontSize: '13px',
            marginTop: '16px',
            marginBottom: '24px'
          }}>
            ⚠️ 로그인 후 반드시 비밀번호를 변경해주세요
          </p>
          <div className={styles.successBtnWrap}>
          <button
            onClick={() => router.push('/auth/login')}
            className={styles.loginButtonfind}
            style={{ marginBottom: 0 }}
          >
            로그인하기
          </button>
              <button
            onClick={() => window.location.href = '/'}
            className={styles.passwordButton}
            style={{ marginBottom: 0 }}
          >
            홈으로 돌아가기
          </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {showErrorModal && (
        <AlertModal
          message={error}
          onClose={() => setShowErrorModal(false)}
        />
      )}
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

          <div className={styles.formGroup}>
            <label className={styles.label}>
              전화번호 <span className={styles.required}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setPhone(val);
                  setTouched({ ...touched, phone: true });
                }}
                onBlur={() => setTouched({ ...touched, phone: true })}
                className={`${styles.input} ${touched.phone && !validatePhone(phone) ? styles.inputError : ''}`}
                placeholder="01012345678"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={loading || timer > 0 || !phone}
                className={styles.sendVerificationButton}
              >
                {timer > 0 ? formatTime(timer) : '인증번호'}
              </button>
            </div>
            {touched.phone && !validatePhone(phone) && (
              <div className={styles.errorMessage}>전화번호를 입력해주세요.</div>
            )}
          </div>

          {isVerificationSent && (
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.label}>
                  인증번호 <span className={styles.required}>*</span>
                </label>
                {timer > 0 && (
                  <span className={styles.timerText}>{formatTime(timer)}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value);
                    setTouched({ ...touched, verificationCode: true });
                  }}
                  onBlur={() => setTouched({ ...touched, verificationCode: true })}
                  className={`${styles.input} ${touched.verificationCode && !verificationCode ? styles.inputError : ''}`}
                  placeholder="인증번호를 입력하세요."
                  maxLength={6}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={loading || !verificationCode}
                  className={styles.sendVerificationButton}
                >
                  확인
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!isEmailValid || loading || !isVerified}
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
    </>
  );
}

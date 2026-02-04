'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AlertModal from '@/components/AlertModal';
import styles from '../auth.module.css';

export default function FindEmailPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    verificationCode: ''
  });
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [foundEmail, setFoundEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [timer, setTimer] = useState(0);
  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    verificationCode: false
  });

  const handleSendVerification = async () => {
    if (!formData.phone) {
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
        body: JSON.stringify({ phone: formData.phone })
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerificationSent(true);
        setTimer(300); // 5분 타이머
        
        // 타이머 시작
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone || !formData.verificationCode) {
      setError('모든 항목을 입력해주세요.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/find-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setFoundEmail(data.email);
      } else {
        setError(data.error || '이메일을 찾을 수 없습니다.');
        setShowErrorModal(true);
      }
    } catch (err) {
      setError('이메일 찾기 중 오류가 발생했습니다.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  if (foundEmail) {
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
            <p className={styles.foundEmail}>사용자님의 이메일 아이디는 <br/>
             <span className={styles.successEmail}>{foundEmail}</span>
             입니다.</p>
          </div>
          <div className={styles.successBtnWrap}>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className={styles.loginButton}
            style={{ marginBottom: 0 }}
          >
            로그인하기
          </button>

                <button
            onClick={() => window.location.href = '/auth/reset-password'}
            className={styles.passwordButton}
            style={{ marginBottom: 0 }}
          >
            비밀번호 찾기
          </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  const isFormValid = formData.name && formData.phone && formData.verificationCode && isVerificationSent;

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
        <span>이메일 찾기</span>
      </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              이름 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setTouched({ ...touched, name: true });
              }}
              onBlur={() => setTouched({ ...touched, name: true })}
              className={`${styles.input} ${touched.name && !formData.name ? styles.inputError : ''}`}
              placeholder="이름을 입력해주세요"
            />
            {touched.name && !formData.name && (
              <div className={styles.errorMessage}>이름을 입력해주세요.</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              전화번호 <span className={styles.required}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setTouched({ ...touched, phone: true });
                }}
                onBlur={() => setTouched({ ...touched, phone: true })}
                className={`${styles.input} ${touched.phone && !formData.phone ? styles.inputError : ''}`}
                placeholder="01012345678"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={loading || timer > 0 || !formData.phone}
                className={styles.sendVerificationButton}
              >
                {timer > 0 ? formatTime(timer) : '인증번호'}
              </button>
            </div>
            {touched.phone && !formData.phone && (
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
              <input
                type="text"
                value={formData.verificationCode}
                onChange={(e) => {
                  setFormData({ ...formData, verificationCode: e.target.value });
                  setTouched({ ...touched, verificationCode: true });
                }}
                onBlur={() => setTouched({ ...touched, verificationCode: true })}
                className={`${styles.input} ${touched.verificationCode && !formData.verificationCode ? styles.inputError : ''}`}
                placeholder="인증번호를 입력하세요."
                maxLength={6}
              />
              {touched.verificationCode && !formData.verificationCode && (
                <div className={styles.errorMessage}>인증번호를 입력해주세요.</div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || loading}
            className={styles.loginButton}
          >
            {loading ? '확인 중...' : '이메일 찾기'}
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

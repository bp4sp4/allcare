'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';

type PackageType = 'high' | 'college';

interface CardForm {
  cardNo: string;
  expMonth: string;
  expYear: string;
  cardPw: string;
  buyerAuthNo: string;
  buyerPhone: string;
  buyerName: string;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>({
    cardNo: '',
    expMonth: '',
    expYear: '',
    cardPw: '',
    buyerAuthNo: '',
    buyerPhone: '',
    buyerName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payResult, setPayResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => setUserProfile({ name: data.name || '', phone: data.phone || '' }))
        .catch(() => {});
    } else {
      setUserProfile(null);
    }
  }, [pathname]);

  const openPackageModal = (type: PackageType) => {
    setIsMenuOpen(false);
    setSelectedPackage(type);
    setPayResult(null);
    setErrorMsg('');
    setCardForm({
      cardNo: '',
      expMonth: '',
      expYear: '',
      cardPw: '',
      buyerAuthNo: '',
      buyerPhone: userProfile?.phone || '',
      buyerName: userProfile?.name || '',
    });
  };

  const closeModal = () => {
    setSelectedPackage(null);
    setPayResult(null);
    setErrorMsg('');
  };

  const handleCardPayment = async () => {
    const { cardNo, expMonth, expYear, cardPw, buyerAuthNo, buyerPhone, buyerName } = cardForm;
    if (!cardNo || !expMonth || !expYear || !cardPw || !buyerAuthNo || !buyerPhone || !buyerName) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      let userId = '';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || '';
        } catch {}
      }

      const res = await fetch('/api/payments/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cardForm, packageType: selectedPackage, userId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || '결제에 실패했습니다.');
        setPayResult('error');
      } else {
        setPayResult('success');
      }
    } catch {
      setErrorMsg('결제 요청 중 오류가 발생했습니다.');
      setPayResult('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const packageLabel = selectedPackage === 'high' ? '고등학교 졸업자 패키지 117만원' : '대학교 졸업자 패키지 72만원';
  const packagePrice = selectedPackage === 'high' ? '1,170,000원' : '720,000원';

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/logo.png"
            alt="한평생올케어"
            width={117}
            height={17}
            priority
          />
        </Link>

        <button
          className={styles.hamburger}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="메뉴"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M28.5 24C29.3284 24 30 24.6716 30 25.5C30 26.3284 29.3284 27 28.5 27H7.5C6.67157 27 6 26.3284 6 25.5C6 24.6716 6.67157 24 7.5 24H28.5ZM28.5 16.5C29.3284 16.5 30 17.1716 30 18C30 18.8284 29.3284 19.5 28.5 19.5H7.5C6.67157 19.5 6 18.8284 6 18C6 17.1716 6.67157 16.5 7.5 16.5H28.5ZM28.5 9C29.3284 9 30 9.67157 30 10.5C30 11.3284 29.3284 12 28.5 12H7.5C6.67157 12 6 11.3284 6 10.5C6 9.67157 6.67157 9 7.5 9H28.5Z" fill="#3D3D3D"/>
          </svg>
        </button>

        <nav className={`${styles.menu} ${isMenuOpen ? styles.menuOpen : ''}`}>
          {!isLoggedIn ? (
            <div className={styles.menuItem}>
              <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                로그인/회원가입
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.menuItem}>
                <Link href="/mypage" onClick={() => setIsMenuOpen(false)}>
                  내정보 관리
                </Link>
              </div>
              <div className={styles.menuItem}>
                <Link href="/auth/login" onClick={() => {
                  localStorage.removeItem('token');
                  setIsLoggedIn(false);
                  setIsMenuOpen(false);
                  window.dispatchEvent(new Event('authChange'));
                }}>
                  로그아웃
                </Link>
              </div>
            </>
          )}

          <div className={styles.menuItem}>
            <button className={styles.menuBtn} onClick={() => openPackageModal('high')}>
              고등학교 졸업자 패키지 117만원
            </button>
          </div>
          <div className={styles.menuItem}>
            <button className={styles.menuBtn} onClick={() => openPackageModal('college')}>
              대학교 졸업자 패키지 72만원
            </button>
          </div>

          <div className={styles.menuItem}>
            <a href="https://korhrd.co.kr/" target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)}>
              한평생직업훈련 바로가기
            </a>
          </div>
          <div className={styles.menuItem}>
            <Link href="/matching" onClick={() => setIsMenuOpen(false)}>
              올케어 실습매칭 시스템
            </Link>
          </div>
        </nav>
      </header>

      {/* 카드 결제 모달 */}
      {selectedPackage && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            {payResult === 'success' ? (
              <div className={styles.resultBox}>
                <div className={styles.resultIcon}>✓</div>
                <p className={styles.resultTitle}>결제 완료</p>
                <p className={styles.resultDesc}>{packageLabel} 결제가 완료되었습니다.<br />빠른 시일 내에 담당자가 연락드리겠습니다.</p>
                <button className={styles.closeBtn} onClick={closeModal}>닫기</button>
              </div>
            ) : payResult === 'error' ? (
              <div className={styles.resultBox}>
                <div className={styles.resultIconError}>✕</div>
                <p className={styles.resultTitle}>결제 실패</p>
                <p className={styles.resultDesc}>{errorMsg}</p>
                <button className={styles.closeBtn} onClick={() => setPayResult(null)}>다시 시도</button>
              </div>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>{packageLabel}</h2>
                  <button className={styles.modalClose} onClick={closeModal}>✕</button>
                </div>
                <p className={styles.modalPrice}>{packagePrice}</p>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>카드번호</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="숫자만 입력 (공백 없이)"
                    maxLength={16}
                    value={cardForm.cardNo}
                    onChange={(e) => setCardForm({ ...cardForm, cardNo: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>유효월 (MM)</label>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="01~12"
                      maxLength={2}
                      value={cardForm.expMonth}
                      onChange={(e) => setCardForm({ ...cardForm, expMonth: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>유효년 (YY)</label>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="25"
                      maxLength={2}
                      value={cardForm.expYear}
                      onChange={(e) => setCardForm({ ...cardForm, expYear: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>카드 비밀번호 앞 2자리</label>
                  <input
                    className={styles.fieldInput}
                    type="password"
                    placeholder="**"
                    maxLength={2}
                    value={cardForm.cardPw}
                    onChange={(e) => setCardForm({ ...cardForm, cardPw: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>생년월일 6자리 (주민번호 앞자리)</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="YYMMDD"
                    maxLength={6}
                    value={cardForm.buyerAuthNo}
                    onChange={(e) => setCardForm({ ...cardForm, buyerAuthNo: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>이름</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="홍길동"
                    value={cardForm.buyerName}
                    onChange={(e) => setCardForm({ ...cardForm, buyerName: e.target.value })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>휴대폰 번호</label>
                  <input
                    className={styles.fieldInput}
                    type="tel"
                    placeholder="01012345678"
                    value={cardForm.buyerPhone}
                    onChange={(e) => setCardForm({ ...cardForm, buyerPhone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>

                <button
                  className={styles.payBtn}
                  onClick={handleCardPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '결제 처리 중...' : `${packagePrice} 결제하기`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

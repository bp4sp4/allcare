'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

const PACKAGES = {
  high: {
    fullName: '[고졸] 요양보호사 자격증 패키지',
    desc: '[고졸] 요양보호사 자격증 패키지 전과정',
    price: 1170000,
  },
  college: {
    fullName: '[대졸] 요양보호사 자격증 패키지',
    desc: '[대졸] 요양보호사 자격증 패키지 전과정',
    price: 720000,
  },
};

function PackagePaymentContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as 'high' | 'college' | null;
  const pkg = type && PACKAGES[type] ? PACKAGES[type] : null;

  const [step, setStep] = useState<'info' | 'card' | 'done' | 'fail'>('info');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [card, setCard] = useState({
    cardNo: '', expMonth: '', expYear: '', cardPw: '', authNo: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.phone) setPhone(d.phone);
          if (d.name) setUserName(d.name);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    setAgreeAll(agreeTerms && agreePrivacy);
  }, [agreeTerms, agreePrivacy]);

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
  };

  const goToCard = () => {
    if (!phone) { alert('연락처를 입력해주세요.'); return; }
    if (!agreeTerms || !agreePrivacy) { alert('필수 약관에 동의해주세요.'); return; }
    setStep('card');
  };

  const handlePay = async () => {
    const { cardNo, expMonth, expYear, cardPw, authNo } = card;
    if (!cardNo || !expMonth || !expYear || !cardPw || !authNo) {
      alert('카드 정보를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      let userId = '';
      if (token) {
        try { userId = JSON.parse(atob(token.split('.')[1])).userId || ''; } catch {}
      }

      const res = await fetch('/api/payments/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType: type,
          cardNo,
          expMonth,
          expYear,
          cardPw,
          buyerAuthNo: authNo,
          buyerName: userName,
          buyerPhone: phone,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || '결제에 실패했습니다.');
        setStep('fail');
      } else {
        setStep('done');
      }
    } catch {
      setErrorMsg('결제 요청 중 오류가 발생했습니다.');
      setStep('fail');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pkg) {
    return (
      <div className={styles.errorWrap}>
        <p>잘못된 접근입니다.</p>
        <a href="/">홈으로</a>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <span className={styles.logo}>PAYAPP</span>
          <span className={styles.headerSub}>비대면 결제서비스 페이앱</span>
        </div>
        <div className={styles.resultWrap}>
          <div className={styles.resultCheck}>✓</div>
          <p className={styles.resultTitle}>결제가 완료되었습니다</p>
          <p className={styles.resultDesc}>{pkg.fullName}<br />{pkg.price.toLocaleString()}원<br /><br />빠른 시일 내에 담당자가 연락드리겠습니다.</p>
          <a href="/" className={styles.homeBtn}>홈으로</a>
        </div>
      </div>
    );
  }

  if (step === 'fail') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <span className={styles.logo}>PAYAPP</span>
          <span className={styles.headerSub}>비대면 결제서비스 페이앱</span>
        </div>
        <div className={styles.resultWrap}>
          <div className={styles.resultX}>✕</div>
          <p className={styles.resultTitle}>결제에 실패했습니다</p>
          <p className={styles.resultDesc}>{errorMsg}</p>
          <button className={styles.homeBtn} onClick={() => setStep('card')}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (step === 'card') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => setStep('info')}>←</button>
          <span className={styles.logo}>PAYAPP</span>
          <span className={styles.headerSub}>비대면 결제서비스 페이앱</span>
        </div>

        <div className={styles.productSection}>
          <div className={styles.productName}>{pkg.fullName}</div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>결제금액 &gt;</span>
            <span className={styles.price}>{pkg.price.toLocaleString()}</span>
            <span className={styles.priceUnit}>원</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.cardSection}>
          <div className={styles.fieldLabel}>카드번호</div>
          <input className={styles.fieldInput} type="text" placeholder="숫자 16자리"
            maxLength={16} value={card.cardNo}
            onChange={(e) => setCard({ ...card, cardNo: e.target.value.replace(/\D/g, '') })} />

          <div className={styles.fieldRow}>
            <div className={styles.fieldHalf}>
              <div className={styles.fieldLabel}>유효월 (MM)</div>
              <input className={styles.fieldInput} type="text" placeholder="01" maxLength={2}
                value={card.expMonth}
                onChange={(e) => setCard({ ...card, expMonth: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className={styles.fieldHalf}>
              <div className={styles.fieldLabel}>유효년 (YY)</div>
              <input className={styles.fieldInput} type="text" placeholder="26" maxLength={2}
                value={card.expYear}
                onChange={(e) => setCard({ ...card, expYear: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldHalf}>
              <div className={styles.fieldLabel}>비밀번호 앞 2자리</div>
              <input className={styles.fieldInput} type="password" placeholder="••" maxLength={2}
                value={card.cardPw}
                onChange={(e) => setCard({ ...card, cardPw: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className={styles.fieldHalf}>
              <div className={styles.fieldLabel}>생년월일 6자리</div>
              <input className={styles.fieldInput} type="text" placeholder="YYMMDD" maxLength={6}
                value={card.authNo}
                onChange={(e) => setCard({ ...card, authNo: e.target.value.replace(/\D/g, '') })} />
            </div>
          </div>
        </div>

        <div className={styles.btnRowFixed}>
          <button className={styles.btnPay} onClick={handlePay} disabled={isSubmitting}>
            {isSubmitting ? '결제 처리 중...' : `${pkg.price.toLocaleString()}원 바로결제`}
          </button>
        </div>
      </div>
    );
  }

  // step === 'info'
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.logo}>PAYAPP</span>
        <span className={styles.headerSub}>비대면 결제서비스 페이앱</span>
      </div>

      <div className={styles.productSection}>
        <div className={styles.productName}>{pkg.fullName}</div>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>결제금액 &gt;</span>
          <span className={styles.price}>{pkg.price.toLocaleString()}</span>
          <span className={styles.priceUnit}>원</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.infoRow}>
        <span className={styles.infoKey}>상점명</span>
        <span className={styles.infoVal}>올케어</span>
      </div>

      <div className={styles.divider} />

      <div className={styles.goodsSection}>
        <div className={styles.goodsLabel}>상품 정보</div>
        <div className={styles.goodsRow}>
          <div className={styles.goodsImg}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="4" fill="#e5e7eb"/>
              <path d="M8 24l6-8 4 5 3-4 5 7H8z" fill="#9ca3af"/>
              <circle cx="21" cy="12" r="3" fill="#9ca3af"/>
            </svg>
          </div>
          <span className={styles.goodsDesc}>{pkg.desc}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.phoneSection}>
        <div className={styles.phoneLabel}>연락처</div>
        <input className={styles.phoneInput} type="tel" placeholder="01012345678"
          value={phone} maxLength={11}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
      </div>

      <div className={styles.divider} />

      <div className={styles.agreeSection}>
        <label className={styles.agreeAll}>
          <input type="checkbox" checked={agreeAll} onChange={(e) => handleAgreeAll(e.target.checked)} />
          <span>✓ 전체동의</span>
        </label>
        <div className={styles.agreeItem}>
          <label>
            <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
            <span>✓ 페이앱 이용약관 동의</span>
          </label>
          <a href="https://www.payapp.kr/policy/terms" target="_blank" rel="noopener noreferrer" className={styles.viewLink}>보기</a>
        </div>
        <div className={styles.agreeItem}>
          <label>
            <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
            <span>✓ 개인정보 처리방침 동의</span>
          </label>
          <a href="https://www.payapp.kr/policy/privacy" target="_blank" rel="noopener noreferrer" className={styles.viewLink}>보기</a>
        </div>
      </div>

      <div className={styles.btnRowFixed}>
        <button className={styles.btnPay} onClick={goToCard}>
          바로결제
        </button>
      </div>
    </div>
  );
}

export default function PackagePaymentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 2rem', textAlign: 'center' }}>로딩 중...</div>}>
      <PackagePaymentContent />
    </Suspense>
  );
}

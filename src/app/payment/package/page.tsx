'use client';

import { useState, useEffect, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';

const PACKAGES = {
  high: {
    name: '고등학교 졸업자 패키지',
    price: 1170000,
    description: '고등학교 졸업자를 위한 요양보호사 자격증 취득 패키지',
    features: ['이론 교육 전과정', '실기 교육 전과정', '시험 대비 특강', '합격 보장 관리'],
  },
  college: {
    name: '대학교 졸업자 패키지',
    price: 720000,
    description: '대학교 졸업자를 위한 요양보호사 자격증 취득 패키지',
    features: ['이론 교육 전과정', '실기 교육 전과정', '시험 대비 특강'],
  },
};


function PackagePaymentContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as 'high' | 'college' | null;
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [formData, setFormData] = useState({ buyername: '', recvphone: '', buyeremail: '' });

  const pkg = type && PACKAGES[type] ? PACKAGES[type] : null;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setPaymentSuccess(true);
      window.history.replaceState({}, '', window.location.pathname + window.location.search.replace('&success=true', '').replace('?success=true', ''));
    }
  }, []);

  const handlePayment = () => {
    if (!pkg) return;
    if (!isPayAppLoaded || !window.PayApp) {
      alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    if (!formData.buyername || !formData.recvphone) {
      alert('이름과 연락처를 입력해주세요.');
      return;
    }
    if (!formData.recvphone.match(/^01[0-9]{8,9}$/)) {
      alert('올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)');
      return;
    }

    const token = localStorage.getItem('token');
    let userId = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.userId || '';
      } catch (e) {
        console.error('Token parse error:', e);
      }
    }

    const baseUrl = window.location.origin;
    const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';

    if (!payappUserId) {
      alert('결제 시스템 설정 오류입니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      const orderData = {
        orderId: `PKG-${Date.now()}`,
        userId,
        packageType: type,
        phone: formData.recvphone,
        name: formData.buyername,
      };

      window.PayApp.setDefault('userid', payappUserId);
      window.PayApp.setDefault('shopname', shopName);
      window.PayApp.setParam('goodname', pkg.name);
      window.PayApp.setParam('goodprice', pkg.price.toString());
      window.PayApp.setParam('recvphone', formData.recvphone);
      window.PayApp.setParam('buyername', formData.buyername);
      if (formData.buyeremail) {
        window.PayApp.setParam('buyeremail', formData.buyeremail);
      }
      window.PayApp.setParam('smsuse', 'n');
      window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
      window.PayApp.setParam('returnurl', `${baseUrl}/payment/package?type=${type}&success=true`);
      window.PayApp.setParam('var1', JSON.stringify(orderData));

      window.PayApp.call();
    } catch (error) {
      alert('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (!pkg) {
    return (
      <div style={{ padding: '2rem', paddingTop: '80px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '1rem' }}>잘못된 접근입니다</h1>
        <a href="/" style={{ color: '#0051FF' }}>홈으로 돌아가기</a>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://lite.payapp.kr/public/api/v2/payapp-lite.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.PayApp) {
            window.PayApp.setDefault('userid', process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '');
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어');
            setIsPayAppLoaded(true);
          }
        }}
      />

      <div style={{ padding: '2rem', paddingTop: '80px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>

          {paymentSuccess ? (
            <>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem', color: '#111827' }}>
                결제가 완료되었습니다
              </h1>
              <div style={{ padding: '2rem', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '2px solid #86efac', textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d', marginBottom: '0.5rem' }}>
                  {pkg.name} 결제 완료
                </div>
                <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                  {pkg.price.toLocaleString()}원 결제가 완료되었습니다.<br />
                  빠른 시일 내에 담당자가 연락드리겠습니다.
                </div>
              </div>
              <a href="/" style={{ display: 'block', textAlign: 'center', padding: '1rem', backgroundColor: '#0051FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                홈으로
              </a>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
                {pkg.name}
              </h1>

              <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem' }}>{pkg.description}</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                  {pkg.price.toLocaleString()}원
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>일시불 결제</div>
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                {pkg.features.map((f, i) => (
                  <div key={i} style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>✓ {f}</div>
                ))}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  이름 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.buyername}
                  onChange={(e) => setFormData({ ...formData, buyername: e.target.value })}
                  placeholder="홍길동"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#0051FF'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  연락처 <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.recvphone}
                  onChange={(e) => setFormData({ ...formData, recvphone: e.target.value })}
                  placeholder="01012345678"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#0051FF'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>이메일</label>
                <input
                  type="email"
                  value={formData.buyeremail}
                  onChange={(e) => setFormData({ ...formData, buyeremail: e.target.value })}
                  placeholder="example@email.com"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
                  onFocus={(e) => e.target.style.borderColor = '#0051FF'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <button
                onClick={handlePayment}
                disabled={!isPayAppLoaded || !formData.buyername || !formData.recvphone}
                style={{
                  width: '100%',
                  padding: '1.125rem',
                  backgroundColor: isPayAppLoaded && formData.buyername && formData.recvphone ? '#0051FF' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.125rem',
                  cursor: isPayAppLoaded && formData.buyername && formData.recvphone ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                {!isPayAppLoaded ? '로딩 중...' : `${pkg.price.toLocaleString()}원 결제하기`}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function PackagePaymentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 2rem', textAlign: 'center' }}>로딩 중...</div>}>
      <PackagePaymentContent />
    </Suspense>
  );
}

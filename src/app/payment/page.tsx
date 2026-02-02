'use client';

import { useState } from 'react';
import Script from 'next/script';

// PayApp SDK 타입 정의
declare global {
  interface Window {
    PayApp: {
      setDefault: (key: string, value: string) => typeof window.PayApp;
      setParam: (key: string, value: string) => typeof window.PayApp;
      call: (params?: Record<string, string>) => void;
      payrequest: () => void;
      rebill: () => void;
    };
  }
}

export default function PaymentPage() {
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [paymentData, setPaymentData] = useState({
    goodname: '구독 서비스',
    goodprice: '20000',
    buyername: '',
    recvphone: '',
    buyeremail: '',
    rebillCycleType: 'Month',
    rebillCycleMonth: '1',
    rebillExpire: '2027-12-31',
    var1: '',
  });

  const handlePayment = () => {
    if (!isPayAppLoaded || !window.PayApp) {
      alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // PayApp 정기결제 요청
    window.PayApp.setDefault('userid', process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '');
    window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || 'AllCare Shop');
    
    // 정기결제 정보 설정
    window.PayApp.setParam('goodname', paymentData.goodname);
    window.PayApp.setParam('goodprice', paymentData.goodprice);
    window.PayApp.setParam('recvphone', paymentData.recvphone);
    window.PayApp.setParam('buyername', paymentData.buyername);
    window.PayApp.setParam('buyeremail', paymentData.buyeremail);
    window.PayApp.setParam('smsuse', 'n'); // SMS 전송 안함
    window.PayApp.setParam('rebillCycleType', paymentData.rebillCycleType);
    window.PayApp.setParam('rebillCycleMonth', paymentData.rebillCycleMonth);
    window.PayApp.setParam('rebillExpire', paymentData.rebillExpire);
    window.PayApp.setParam('feedbackurl', `${window.location.origin}/api/payments/webhook`);
    window.PayApp.setParam('returnurl', `${window.location.origin}/payment/result`);
    window.PayApp.setParam('var1', paymentData.var1 || new Date().toISOString());
    
    // 정기결제 호출
    window.PayApp.rebill();
  };

  return (
    <>
      <Script
        src="https://lite.payapp.kr/public/api/v2/payapp-lite.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('PayApp SDK loaded');
          // PayApp 기본 설정
          if (window.PayApp) {
            const userId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
            console.log('PayApp USER_ID:', userId ? 'Set' : 'Not Set');
            window.PayApp.setDefault('userid', userId);
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || 'AllCare Shop');
            setIsPayAppLoaded(true);
          } else {
            console.error('PayApp object not found');
          }
        }}
        onError={(e) => {
          console.error('PayApp SDK failed to load:', e);
        }}
      />

      <div style={{ 
        padding: '2rem', 
        maxWidth: '600px', 
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
        <h1 style={{ marginBottom: '1rem', color: '#111827', fontSize: '1.5rem' }}>정기구독 결제</h1>
        
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '0.5rem' }}>
            <strong>{paymentData.goodname}</strong>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0c4a6e' }}>
            월 {Number(paymentData.goodprice).toLocaleString()}원
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.25rem' }}>
            매월 자동결제 • 언제든 해지 가능
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            이름 <span style={{ color: 'red' }}>*</span>
            <input
              type="text"
              value={paymentData.buyername}
              onChange={(e) => setPaymentData({ ...paymentData, buyername: e.target.value })}
              placeholder="홍길동"
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                marginTop: '0.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0070f3'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            연락처 <span style={{ color: 'red' }}>*</span>
            <input
              type="tel"
              value={paymentData.recvphone}
              onChange={(e) => setPaymentData({ ...paymentData, recvphone: e.target.value })}
              placeholder="01012345678"
              required
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                marginTop: '0.25rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0070f3'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: 'none',
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          추가 옵션 (선택사항)
        </button>

        {showAdvanced && (
          <div style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                이메일
                <input
                  type="email"
                  value={paymentData.buyeremail}
                  onChange={(e) => setPaymentData({ ...paymentData, buyeremail: e.target.value })}
                  placeholder="example@email.com"
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    marginTop: '0.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                결제일 (매월)
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={paymentData.rebillCycleMonth}
                  onChange={(e) => setPaymentData({ ...paymentData, rebillCycleMonth: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    marginTop: '0.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                구독 만료일
                <input
                  type="date"
                  value={paymentData.rebillExpire}
                  onChange={(e) => setPaymentData({ ...paymentData, rebillExpire: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    marginTop: '0.25rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </label>
            </div>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={!isPayAppLoaded || !paymentData.buyername || !paymentData.recvphone}
          style={{
            width: '100%',
            padding: '1.125rem',
            backgroundColor: isPayAppLoaded && paymentData.buyername && paymentData.recvphone ? '#0070f3' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.125rem',
            cursor: isPayAppLoaded && paymentData.buyername && paymentData.recvphone ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            boxShadow: isPayAppLoaded && paymentData.buyername && paymentData.recvphone ? '0 4px 12px rgba(0, 112, 243, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (isPayAppLoaded && paymentData.buyername && paymentData.recvphone) {
              e.currentTarget.style.backgroundColor = '#0060d9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (isPayAppLoaded && paymentData.buyername && paymentData.recvphone) {
              e.currentTarget.style.backgroundColor = '#0070f3';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {!isPayAppLoaded ? '로딩 중...' : '월 ' + Number(paymentData.goodprice).toLocaleString() + '원 구독 시작하기'}
        </button>

        {!isPayAppLoaded && (
          <p style={{ marginTop: '1rem', color: '#9ca3af', textAlign: 'center', fontSize: '0.875rem' }}>
            결제 시스템을 준비하고 있습니다...
          </p>
        )}
        
        {isPayAppLoaded && (!paymentData.buyername || !paymentData.recvphone) && (
          <p style={{ marginTop: '0.75rem', color: '#ef4444', textAlign: 'center', fontSize: '0.875rem' }}>
            이름과 연락처를 입력해주세요
          </p>
        )}
        
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.75rem', color: '#6b7280', lineHeight: '1.5' }}>
          <div style={{ marginBottom: '0.5rem' }}>✓ 첫 결제 후 매월 자동 결제됩니다</div>
          <div style={{ marginBottom: '0.5rem' }}>✓ 언제든지 해지 가능합니다</div>
          <div>✓ 결제 3일 전 알림을 보내드립니다</div>
        </div>
        </div>
      </div>
    </>
  );
}

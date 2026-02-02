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
    };
  }
}

export default function PaymentPage() {
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [paymentData, setPaymentData] = useState({
    goodname: 'test good',
    price: '1000',
    recvphone: '01000000000',
    var1: '',
  });

  const handlePayment = () => {
    if (!isPayAppLoaded || !window.PayApp) {
      alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // PayApp 결제 요청 - 예제 방식
    window.PayApp.call({
      goodname: paymentData.goodname,
      price: paymentData.price,
      recvphone: paymentData.recvphone,
      feedbackurl: `${window.location.origin}/api/payments/webhook`,
      returnurl: `${window.location.origin}/payment/result`,
      var1: paymentData.var1 || new Date().toISOString()
    });
  };

  return (
    <>
      <Script
        src="//lite.payapp.kr/public/api/v2/payapp-lite.js"
        onLoad={() => {
          // PayApp 기본 설정
          if (window.PayApp) {
            window.PayApp.setDefault('userid', process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '');
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || 'AllCare Shop');
            setIsPayAppLoaded(true);
          }
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
        <h1 style={{ marginBottom: '2rem', color: '#111827' }}>페이앱 결제</h1>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            상품명:
            <input
              type="text"
              value={paymentData.goodname}
              onChange={(e) => setPaymentData({ ...paymentData, goodname: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                marginTop: '0.25rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            결제금액:
            <input
              type="number"
              value={paymentData.price}
              onChange={(e) => setPaymentData({ ...paymentData, price: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                marginTop: '0.25rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            연락처:
            <input
              type="tel"
              value={paymentData.recvphone}
              onChange={(e) => setPaymentData({ ...paymentData, recvphone: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                marginTop: '0.25rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            주문번호 (선택):
            <input
              type="text"
              value={paymentData.var1}
              onChange={(e) => setPaymentData({ ...paymentData, var1: e.target.value })}
              placeholder="자동 생성됩니다"
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                marginTop: '0.25rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>

        <button
          onClick={handlePayment}
          disabled={!isPayAppLoaded}
          style={{
            width: '100%',
            padding: '1rem',
            backgroundColor: isPayAppLoaded ? '#0070f3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isPayAppLoaded ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          {isPayAppLoaded ? '결제하기' : '로딩 중...'}
        </button>

        {!isPayAppLoaded && (
          <p style={{ marginTop: '1rem', color: '#666', textAlign: 'center' }}>
            결제 시스템을 로딩 중입니다...
          </p>
        )}
        </div>
      </div>
    </>
  );
}

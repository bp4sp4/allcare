'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import styles from './payment.module.css';

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
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState({
    goodname: '올케어구독상품',
    goodprice: '20000',
    buyername: '',
    recvphone: '',
    buyeremail: '',
    rebillCycleType: 'Month',
    rebillCycleMonth: '1',
    var1: '',
  });

  useEffect(() => {
    // 팝업인지 확인하고 결제 완료 시 팝업 닫기
    const isPopup = window.opener && window.opener !== window;
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success') === 'true') {
      if (isPopup) {
        // 팝업인 경우: 부모 창을 리프레시하고 팝업 닫기
        console.log('결제 완료 - 팝업 닫기');
        try {
          window.opener.location.href = '/mypage'; // 마이페이지로 이동
          window.close();
        } catch (e) {
          console.error('팝업 닫기 실패:', e);
          setPaymentSuccess(true);
        }
      } else {
        // 일반 페이지인 경우: 성공 메시지 표시
        setPaymentSuccess(true);
        // URL 정리
        window.history.replaceState({}, '', '/payment');
      }
    }
  }, []);

  const handlePayment = () => {
    if (!isPayAppLoaded || !window.PayApp) {
      alert('결제 시스템을 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // 필수 필드 검증
    if (!paymentData.buyername || !paymentData.recvphone) {
      alert('이름과 연락처를 입력해주세요.');
      return;
    }

    if (!paymentData.recvphone.match(/^01[0-9]{8,9}$/)) {
      alert('올바른 휴대폰 번호를 입력해주세요. (예: 01012345678)');
      return;
    }

    // localStorage에서 토큰 가져와서 user_id 추출
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

    // 현재 도메인 가져오기 (배포 환경 대응)
    const baseUrl = window.location.origin;
    const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';

    if (!payappUserId) {
      alert('결제 시스템 설정 오류입니다. 관리자에게 문의하세요.');
      console.error('PAYAPP_USER_ID is not set');
      return;
    }

    try {
      // PayApp 초기화
      window.PayApp.setDefault('userid', payappUserId);
      window.PayApp.setDefault('shopname', shopName);
      
      // 현재 날짜 기준으로 구독 만료일 계산 (1년 후)
      const now = new Date();
      const expireDate = new Date(now);
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      const rebillExpire = expireDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // user_id를 var1에 포함
      const orderData = {
        orderId: `ORDER-${Date.now()}`,
        userId: userId,
        phone: paymentData.recvphone,
        name: paymentData.buyername
      };
      
      // 정기결제 정보 설정
      window.PayApp.setParam('goodname', paymentData.goodname);
      window.PayApp.setParam('goodprice', paymentData.goodprice);
      window.PayApp.setParam('recvphone', paymentData.recvphone);
      window.PayApp.setParam('buyername', paymentData.buyername);
      if (paymentData.buyeremail) {
        window.PayApp.setParam('buyeremail', paymentData.buyeremail);
      }
      window.PayApp.setParam('smsuse', 'n'); // SMS 전송 안함
      window.PayApp.setParam('rebillCycleType', paymentData.rebillCycleType);
      window.PayApp.setParam('rebillCycleMonth', paymentData.rebillCycleMonth);
      window.PayApp.setParam('rebillExpire', rebillExpire);
      window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
      window.PayApp.setParam('returnurl', `${baseUrl}/payment?success=true`);
      window.PayApp.setParam('var1', JSON.stringify(orderData));
      
      console.log('Payment request:', {
        userid: payappUserId,
        shopname: shopName,
        goodname: paymentData.goodname,
        goodprice: paymentData.goodprice,
        buyername: paymentData.buyername,
        recvphone: paymentData.recvphone,
        rebillCycleType: paymentData.rebillCycleType,
        rebillCycleMonth: paymentData.rebillCycleMonth,
        rebillExpire,
        baseUrl,
        feedbackurl: `${baseUrl}/api/payments/webhook`,
        returnurl: `${baseUrl}/payment?success=true`,
        orderData
      });
      
      // 정기결제 호출
      window.PayApp.rebill();
    } catch (error) {
      console.error('Payment error:', error);
      alert('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
        {paymentSuccess ? (
          // 구독 완료 화면
          <>
            <h1 style={{ marginBottom: '1.5rem', color: '#111827', fontSize: '2rem', textAlign: 'center', fontWeight: 'bold' }}>
              구독되었습니다
            </h1>
            
            <div style={{ 
              marginBottom: '2rem', 
              padding: '2rem', 
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '2px solid #86efac',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                ✓
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#15803d', marginBottom: '1rem' }}>
                정기구독이 등록되었습니다!
              </div>
              <div style={{ fontSize: '0.875rem', color: '#166534', lineHeight: '1.8' }}>
                ✓ 첫 결제는 등록 즉시 진행됩니다<br/>
                ✓ 이후 매월 자동으로 결제됩니다<br/>
                ✓ 언제든지 해지 가능합니다
              </div>
            </div>

            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              marginBottom: '2rem',
              border: '1px solid #bfdbfe'
            }}>
              <div style={{ fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.75rem' }}>
                <strong>월 구독료:</strong> {Number(paymentData.goodprice).toLocaleString()}원
              </div>
              <div style={{ fontSize: '0.95rem', color: '#1e40af' }}>
                <strong>다음 결제일:</strong> 매월 {paymentData.rebillCycleMonth}일
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href="/mypage"
                style={{
                  padding: '1rem',
                  backgroundColor: '#0051FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  textAlign: 'center'
                }}
              >
                내정보 관리로 이동
              </a>
              <a
                href="/"
                style={{
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textDecoration: 'none',
                  textAlign: 'center'
                }}
              >
                홈으로
              </a>
            </div>
          </>
        ) : (
          // 기존 결제 폼
          <>
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

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
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
                fontSize: '1rem'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0070f3'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </label>
        </div>

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
          
        </div>
        </>
        )}
        </div>
      </div>
    </>
  );
}

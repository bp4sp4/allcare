'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

interface CustomPaymentRequest {
  id: string;
  subject: string;
  subject_count: number;
  amount: number;
  created_at: string;
}

export default function CustomPaymentPage() {
  const router = useRouter();
  const [isPayAppLoaded, setIsPayAppLoaded] = useState(false);
  const [requests, setRequests] = useState<CustomPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ buyername: '', recvphone: '', buyeremail: '' });
  const [selectedRequest, setSelectedRequest] = useState<CustomPaymentRequest | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // 결제 완료 콜백 처리
    const urlParams = new URLSearchParams(window.location.search);
    const successRequestId = urlParams.get('paid');
    if (successRequestId) {
      fetch('/api/custom-payment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId: successRequestId, orderId: urlParams.get('orderId') }),
      }).then(() => {
        const isPopup = window.opener && window.opener !== window;
        if (isPopup) {
          try {
            window.opener.location.href = '/?pkg=high';
            window.close();
          } catch {
            setPaidId(successRequestId);
            window.history.replaceState({}, '', '/payment/custom');
          }
        } else {
          setPaidId(successRequestId);
          window.history.replaceState({}, '', '/payment/custom');
        }
      });
    }

    fetch('/api/custom-payment/pending', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setRequests(data.requests || []);
        if (data.requests?.length === 1) {
          setSelectedRequest(data.requests[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handlePayment = (req: CustomPaymentRequest) => {
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
    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
    const shopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '올케어';
    const orderId = `CUSTOM-${Date.now()}`;

    if (!payappUserId) {
      alert('결제 시스템 설정 오류입니다. 관리자에게 문의하세요.');
      return;
    }

    try {
      window.PayApp.setDefault('userid', payappUserId);
      window.PayApp.setDefault('shopname', shopName);
      window.PayApp.setParam('goodname', `단과반 - ${req.subject}`);
      window.PayApp.setParam('goodprice', req.amount.toString());
      window.PayApp.setParam('recvphone', formData.recvphone);
      window.PayApp.setParam('buyername', formData.buyername);
      if (formData.buyeremail) {
        window.PayApp.setParam('buyeremail', formData.buyeremail);
      }
      window.PayApp.setParam('smsuse', 'n');
      window.PayApp.setParam('feedbackurl', `${baseUrl}/api/payments/webhook`);
      window.PayApp.setParam('returnurl', `${baseUrl}/payment/custom?paid=${req.id}&orderId=${orderId}`);
      window.PayApp.setParam('var1', JSON.stringify({ orderId, userId, requestId: req.id, type: 'custom' }));
      window.PayApp.call();
    } catch (error) {
      alert('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 2rem', textAlign: 'center', color: '#6b7280' }}>
        불러오는 중...
      </div>
    );
  }

  if (paidId) {
    return (
      <div style={{ padding: '2rem', paddingTop: '80px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.75rem' }}>결제 완료</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>단과반 결제가 완료되었습니다.<br />빠른 시일 내에 담당자가 연락드리겠습니다.</p>
          <a href="/" style={{ display: 'block', padding: '1rem', backgroundColor: '#0051FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            홈으로
          </a>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: '2rem', paddingTop: '80px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.75rem' }}>결제 요청 없음</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>현재 진행 중인 단과반 결제 요청이 없습니다.</p>
          <a href="/" style={{ display: 'block', padding: '1rem', backgroundColor: '#0051FF', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            홈으로
          </a>
        </div>
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
            window.PayApp.setDefault('shopname', process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '올케어');
            setIsPayAppLoaded(true);
          }
        }}
      />

      <div style={{ padding: '2rem', paddingTop: '80px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>단과반 결제</h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>관리자가 요청한 단과반 결제입니다.</p>

          {/* 결제 요청 선택 (복수인 경우) */}
          {requests.length > 1 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>결제 항목 선택</label>
              {requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${selectedRequest?.id === req.id ? '#0051FF' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: selectedRequest?.id === req.id ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#111827' }}>{req.subject}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {req.subject_count}과목 · {req.amount.toLocaleString()}원
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 선택된 결제 항목 표시 */}
          {selectedRequest && (
            <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>결제 항목</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.25rem' }}>
                단과반 - {selectedRequest.subject}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.5rem' }}>
                {selectedRequest.subject_count}과목
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                {selectedRequest.amount.toLocaleString()}원
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>일시불 결제</div>
            </div>
          )}

          {requests.length === 1 && (
            <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>결제 항목</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '0.25rem' }}>
                단과반 - {requests[0].subject}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#3b82f6', marginBottom: '0.5rem' }}>
                {requests[0].subject_count}과목
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                {requests[0].amount.toLocaleString()}원
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>일시불 결제</div>
            </div>
          )}

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
            onClick={() => {
              const req = selectedRequest || (requests.length === 1 ? requests[0] : null);
              if (!req) { alert('결제 항목을 선택해주세요.'); return; }
              handlePayment(req);
            }}
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
            {!isPayAppLoaded ? '로딩 중...' : `${(selectedRequest || requests[0])?.amount.toLocaleString()}원 결제하기`}
          </button>
        </div>
      </div>
    </>
  );
}

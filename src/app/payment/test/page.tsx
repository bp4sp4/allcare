'use client';

import { useState, useEffect } from 'react';

export default function TestPaymentPage() {
  const [phone, setPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handlePay = async () => {
    if (!phone) { alert('연락처를 입력해주세요.'); return; }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let userId = '';
      if (token) {
        try { userId = JSON.parse(atob(token.split('.')[1])).userId || ''; } catch {}
      }

      const res = await fetch('/api/payments/request-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recvphone: phone, buyerName: userName, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.payurl) {
        alert(data.error || '결제 요청에 실패했습니다.');
        return;
      }

      const w = 480, h = 700;
      const left = Math.max(0, (window.screen.width - w) / 2);
      const top = Math.max(0, (window.screen.height - h) / 2);
      window.open(data.payurl, 'payapp', `width=${w},height=${h},top=${top},left=${left},scrollbars=yes`);
    } catch {
      alert('결제 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>
        고등학교 졸업자 패키지 — 테스트 결제
      </h2>
      <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        실제 결제금액: <strong style={{ color: '#333' }}>30,000원</strong>
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#555' }}>이름</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="홍길동"
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#555' }}>연락처</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="01012345678"
          maxLength={11}
          style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={handlePay}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '0.85rem',
          backgroundColor: isLoading ? '#aaa' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: '1rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? '처리 중...' : '30,000원 결제하기'}
      </button>
    </div>
  );
}

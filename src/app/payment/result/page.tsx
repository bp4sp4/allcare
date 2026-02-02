'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // URL 파라미터에서 결제 결과 정보 추출
    const params: any = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    setResult(params);

    // 결제 결과를 서버로 전송하여 저장
    if (params.RETURNCODE === '0000') {
      fetch('/api/payments/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    }
  }, [searchParams]);

  if (!result) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>결제 결과를 확인하는 중...</p>
      </div>
    );
  }

  const isSuccess = result.RETURNCODE === '0000';

  return (
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
      <h1 style={{ marginBottom: '2rem', textAlign: 'center', color: '#111827' }}>
        {isSuccess ? '✅ 결제 완료' : '❌ 결제 실패'}
      </h1>

      <div style={{ 
        padding: '1.5rem', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2'
      }}>
        {isSuccess ? (
          <>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>거래번호:</strong> {result.TRADEID || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>주문번호:</strong> {result.var1 || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>상품명:</strong> {result.GOODNAME || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>결제금액:</strong> {result.PRICE ? `${Number(result.PRICE).toLocaleString()}원` : '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>승인시간:</strong> {result.OKTIME || '-'}
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>에러코드:</strong> {result.RETURNCODE || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>에러메시지:</strong> {result.RETURNMSG || '-'}
            </p>
          </>
        )}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a 
          href="/payment"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          다시 결제하기
        </a>
      </div>

      <details style={{ marginTop: '2rem' }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>전체 응답 데이터 보기</summary>
        <pre style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>결제 결과를 로딩 중...</p>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}

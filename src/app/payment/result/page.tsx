'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 팝업인지 확인
    const isPopup = window.opener && window.opener !== window;

    if (isPopup) {
      // 팝업인 경우: 부모 창을 결제완료 페이지로 이동시키고 팝업 닫기
      try {
        window.opener.location.href = '/payment/success';
        window.close();
      } catch (e) {
        console.error('부모 창 리다이렉트 실패:', e);
        // 실패하면 현재 창에서 이동
        window.location.href = '/payment/success';
      }
      return;
    }

    // 팝업이 아닌 경우 (직접 접근): 원래 로직 유지
    const params: any = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    const hasParams = Object.keys(params).length > 0;
    
    if (!hasParams) {
      setResult({
        isRebill: true,
        success: true,
        message: '정기구독이 등록되었습니다.'
      });
      setLoading(false);
    } else {
      setResult(params);
      setLoading(false);
      
      if (params.RETURNCODE === '0000' || params.TRADEID) {
        fetch('/api/payments/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        }).then(res => res.json())
          .catch(err => console.error('Failed to save result:', err));
      }
    }
  }, [searchParams]);

  if (loading || !result) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>결제 결과를 확인하는 중...</p>
      </div>
    );
  }

  // 정기결제(rebill) 성공
  if (result.isRebill) {
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
            ✅ 정기구독 등록 완료
          </h1>

          <div style={{ 
            padding: '1.5rem', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            backgroundColor: '#f0fdf4'
          }}>
            <p style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 'bold', color: '#15803d' }}>
              {result.message}
            </p>
            <p style={{ marginBottom: '0.5rem', color: '#166534', lineHeight: '1.6' }}>
              • 첫 결제는 등록 즉시 진행됩니다<br/>
              • 이후 매월 자동으로 결제됩니다<br/>
              • 언제든지 해지 가능합니다
            </p>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <a 
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0070f3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
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
              <strong>거래번호:</strong> {result.TRADEID || result.tradeid || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>주문번호:</strong> {result.var1 || result.orderId || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>상품명:</strong> {result.GOODNAME || result.goodname || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>결제금액:</strong> {(result.PRICE || result.price) ? `${Number(result.PRICE || result.price).toLocaleString()}원` : '-'}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>승인시간:</strong> {result.OKTIME || result.oktime || '-'}
            </p>
          </>
        ) : (
          <>
            <p style={{ marginBottom: '1rem', color: '#dc2626', fontWeight: 'bold' }}>
              결제가 실패했습니다
            </p>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong>에러코드:</strong> {result.RETURNCODE || result.returncode || '-'}
            </p>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <strong>에러메시지:</strong> {result.RETURNMSG || result.returnmsg || '-'}
            </p>
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '6px', fontSize: '0.875rem' }}>
              <p style={{ marginBottom: '0.5rem' }}><strong>⚠️ 돈이 빠져나간 경우:</strong></p>
              <p style={{ lineHeight: '1.6', color: '#9a3412' }}>
                결제 승인은 완료되었으나 시스템 오류가 발생했을 수 있습니다. 
                거래 내역이 확인되지 않는 경우, 고객센터로 문의해주세요.
              </p>
            </div>
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

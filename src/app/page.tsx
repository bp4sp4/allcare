import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#111827' }}>💳 AllCare</h1>
      <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '3rem' }}>
        페이앱 결제 연동 프로젝트
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
        <Link 
          href="/auth/login"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
        >
          로그인
        </Link>

        <Link 
          href="/auth/signup"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
        >
          회원가입
        </Link>

        <Link 
          href="/payment"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}
        >
          결제하기
        </Link>
      </div>

      <div style={{ 
        marginTop: '2rem', 
        padding: '2rem', 
        backgroundColor: 'white', 
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#111827' }}>인증 기능</h2>
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '2rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ marginRight: '0.5rem' }}>✅</span>
            <strong>회원가입</strong> - 이메일, 비밀번호, 이름, 전화번호 인증
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ marginRight: '0.5rem' }}>✅</span>
            <strong>로그인</strong> - 이메일/비밀번호 인증
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ marginRight: '0.5rem' }}>✅</span>
            <strong>이메일 찾기</strong> - 이름과 전화번호로 찾기
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <span style={{ marginRight: '0.5rem' }}>✅</span>
            <strong>비밀번호 재설정</strong> - 이메일로 재설정 링크 발송
          </li>
        </ul>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#111827' }}>API 엔드포인트</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#059669' }}>POST /api/auth/signup</code>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#059669' }}>POST /api/auth/login</code>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#0070f3' }}>POST /api/payments</code>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
            <code style={{ fontSize: '0.875rem', color: '#0070f3' }}>POST /api/payments/webhook</code>
          </div>
        </div>
      </div>
    </div>
  );
}

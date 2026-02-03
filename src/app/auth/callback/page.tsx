'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase가 URL 해시에서 토큰을 자동으로 처리
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('인증 오류:', error);
          router.push('/auth/login');
          return;
        }

        if (session) {
          // 세션 정보를 토큰으로 변환
          const token = Buffer.from(JSON.stringify({ 
            userId: session.user.id, 
            email: session.user.email 
          })).toString('base64');

          // 메인 페이지로 리다이렉트하면서 토큰 전달
          router.push(`/?token=${token}`);
        } else {
          // 세션이 없으면 로그인 페이지로
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('콜백 처리 중 오류:', err);
        router.push('/auth/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontSize: '1.125rem',
      color: '#666'
    }}>
      로그인 처리 중...
    </div>
  );
}

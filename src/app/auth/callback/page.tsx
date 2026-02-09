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
          const user = session.user;
          
          // 소셜 로그인 제공자 확인 (kakao, naver, google 등)
          const provider = user.app_metadata.provider || 'email';
          
          // users 테이블에 프로필 확인 및 생성/업데이트
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // 프로필이 없으면 생성
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email!,
                name: user.user_metadata.name || user.user_metadata.full_name || user.email?.split('@')[0] || '사용자',
                avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
                provider: provider,
                phone: user.user_metadata.phone || null
              });

            if (insertError) {
              console.error('프로필 생성 오류:', insertError);
            }
          } else if (!profileError && profile) {
            // 이미 프로필이 있으면 로그인 성공
          }

          // 세션 정보를 토큰으로 변환
          const token = Buffer.from(JSON.stringify({ 
            userId: user.id, 
            email: user.email,
            provider: provider
          })).toString('base64');

          // 메인 페이지로 리다이렉트
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

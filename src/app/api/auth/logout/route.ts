import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    // Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Supabase 세션 종료 (카카오 OAuth)
    await supabase.auth.signOut();

    // 쿠키 삭제
    const response = NextResponse.json({ message: '로그아웃 되었습니다.' });
    
    // 모든 인증 관련 쿠키 삭제
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      expires: new Date(0),
    });
    
    response.cookies.set('naver_oauth_state', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return NextResponse.json({ message: '로그아웃 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

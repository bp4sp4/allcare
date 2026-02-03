import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // 세션 정보를 토큰으로 변환
      const token = Buffer.from(JSON.stringify({ 
        userId: data.user.id, 
        email: data.user.email 
      })).toString('base64');

      // URL에 토큰 포함하여 리다이렉트
      const redirectUrl = new URL('/', requestUrl.origin);
      redirectUrl.searchParams.set('token', token);
      
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 로그인 실패 시 로그인 페이지로
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}

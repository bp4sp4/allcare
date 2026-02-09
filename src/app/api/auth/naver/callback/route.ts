import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Service Role Key로 Supabase Admin 클라이언트 생성
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/login?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/login?error=invalid_request`);
  }

  try {
    // 네이버 액세스 토큰 가져오기
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID || '',
        client_secret: process.env.NAVER_CLIENT_SECRET || '',
        code: code,
        state: state,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // 네이버 사용자 정보 가져오기
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (userData.resultcode !== '00') {
      throw new Error('Failed to get user info');
    }

    const naverUser = userData.response;

    // Supabase에 사용자 생성 또는 로그인
    let userId;
    let userEmail = naverUser.email;

    // 1. Auth에서 이메일로 기존 사용자 확인
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users.find(u => u.email === userEmail);

    if (existingAuthUser) {
      // 기존 사용자 - 로그인만 처리
      userId = existingAuthUser.id;
     
    } else {
      // 새 사용자 생성
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          name: naverUser.name || naverUser.nickname,
          avatar_url: naverUser.profile_image,
          provider: 'naver',
        },
      });

      if (authError) {
        console.error('Supabase Auth 생성 실패:', authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('User data is missing');
      }

      userId = authData.user.id;
      
    }

    // JWT 토큰 생성 (제대로 서명된 토큰)
    const token = jwt.sign(
      { userId, email: userEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    

    // 메인 페이지로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
    const redirectUrl = new URL('/', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('token', token);
    
    const response = NextResponse.redirect(redirectUrl);
    
    // 쿠키에도 저장
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    });

    return response;
  } catch (error) {
    console.error('Naver OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/login?error=oauth_failed`);
  }
}

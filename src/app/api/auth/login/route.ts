import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 먼저 users 테이블에서 이메일로 사용자 확인
    const { data: userCheck, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('id, provider')
      .eq('email', email)
      .maybeSingle();

    // 계정이 아예 없는 경우
    if (!userCheck) {
      return NextResponse.json(
        { error: '일치하는 회원정보가 없어요.', errorType: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Supabase Auth로 로그인 시도
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    // 비밀번호가 틀린 경우
    if (authError) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 일치하지 않습니다.', errorType: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    // users 테이블에서 프로필 정보 조회
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('프로필 조회 오류:', profileError);
      return NextResponse.json(
        { error: '사용자 정보를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 소셜 로그인으로 가입된 계정인지 확인
    if (profile.provider !== 'email') {
      return NextResponse.json(
        { error: `이 계정은 ${profile.provider === 'kakao' ? '카카오' : profile.provider === 'naver' ? '네이버' : '소셜'}로 가입되었습니다.\n${profile.provider === 'kakao' ? '카카오' : profile.provider === 'naver' ? '네이버' : '해당 소셜'}로 로그인해 주세요.` },
        { status: 400 }
      );
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: authData.user.id,
        email: authData.user.email,
        provider: profile.provider
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: '로그인 성공',
      token,
      user: {
        id: authData.user.id,
        email: profile.email,
        name: profile.name,
        provider: profile.provider
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

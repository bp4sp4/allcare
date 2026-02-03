import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, verificationCode } = body;

    // 유효성 검사
    if (!email || !password || !name || !phone || !verificationCode) {
      return NextResponse.json(
        { error: '모든 필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호 인증 확인
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', verificationCode)
      .eq('verified', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: '유효하지 않은 인증번호입니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 가입되어 있는 이메일입니다.' },
        { status: 400 }
      );
    }

    // Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
        provider: 'email'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      // 이메일 중복 에러 처리
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        return NextResponse.json(
          { error: '이미 가입되어 있는 이메일입니다.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: '회원가입 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // users 테이블에 프로필 생성 (트리거로 자동 생성되지만 phone 정보 업데이트)
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .update({ phone, name })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.'
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

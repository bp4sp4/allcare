import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, verificationCode } = body;

    if (!name || !phone || !verificationCode) {
      return NextResponse.json(
        { error: '모든 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호 인증 확인
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', verificationCode)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: '유효하지 않은 인증번호입니다.' },
        { status: 400 }
      );
    }

    // 인증번호 사용 완료 처리
    await supabaseAdmin
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    // 이름과 전화번호로 사용자 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('name', name)
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: '일치하는 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      message: '이메일을 찾았습니다.'
    });

  } catch (error) {
    console.error('Find email error:', error);
    return NextResponse.json(
      { error: '이메일 찾기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

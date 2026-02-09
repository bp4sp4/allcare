import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: '존재하지 않는 이메일입니다.' },
        { status: 404 }
      );
    }

    // 8자리 임시 비밀번호 생성 (영문 대소문자 + 숫자)
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase() + 
                        Math.floor(Math.random() * 100).toString().padStart(2, '0');

    // Supabase Auth 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError);
      return NextResponse.json(
        { error: '임시 비밀번호 설정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '임시 비밀번호가 발급되었습니다.',
      tempPassword: tempPassword // 개발용 - 실제로는 이메일/SMS로 발송
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

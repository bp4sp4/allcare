import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendVerificationSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: '전화번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 6자리 랜덤 인증번호 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 만료 시간 (5분)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Supabase에 인증번호 저장
    const { error: dbError } = await supabaseAdmin
      .from('phone_verifications')
      .insert({
        phone,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false
      });

    if (dbError) {
      console.error('DB 저장 오류:', dbError);
      return NextResponse.json(
        { error: '인증번호 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 네이버 SENS로 SMS 발송
    const smsSent = await sendVerificationSMS(phone, code);

    if (!smsSent) {
      console.error('SMS 발송 실패');
      // SMS 발송 실패해도 개발 환경에서는 계속 진행
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'SMS 발송에 실패했습니다.' },
          { status: 500 }
        );
      }
    }


    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      // 개발 환경에서만 코드 반환
      ...(process.env.NODE_ENV === 'development' && { code })
    });

  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: '인증번호 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

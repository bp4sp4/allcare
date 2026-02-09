import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: '전화번호와 인증번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Supabase에서 인증번호 확인
    const { data: verification, error: dbError } = await supabaseAdmin
      .from('phone_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !verification) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 인증번호입니다.' },
        { status: 400 }
      );
    }

    // 인증 완료 처리
    const { error: updateError } = await supabaseAdmin
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    if (updateError) {
      console.error('인증 완료 처리 오류:', updateError);
      return NextResponse.json(
        { error: '인증 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }



    return NextResponse.json({
      success: true,
      message: '전화번호 인증이 완료되었습니다.'
    });

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: '인증번호 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

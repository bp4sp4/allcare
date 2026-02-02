import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// TODO: 실제 데이터베이스 연결
// import { db } from '@/lib/db';

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

    // TODO: 전화번호 인증 확인
    // const verification = await db.phoneVerifications.findFirst({
    //   where: {
    //     phone,
    //     code: verificationCode,
    //     verified: true,
    //     expiresAt: { gt: new Date() }
    //   }
    // });
    
    // if (!verification) {
    //   return NextResponse.json(
    //     { error: '유효하지 않은 인증번호입니다.' },
    //     { status: 400 }
    //   );
    // }

    // TODO: 이메일 중복 확인
    // const existingUser = await db.users.findUnique({
    //   where: { email }
    // });
    
    // if (existingUser) {
    //   return NextResponse.json(
    //     { error: '이미 사용 중인 이메일입니다.' },
    //     { status: 400 }
    //   );
    // }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // TODO: 사용자 생성
    // const user = await db.users.create({
    //   data: {
    //     email,
    //     passwordHash,
    //     name,
    //     phone,
    //     phoneVerified: true
    //   }
    // });

    console.log('User signup:', { email, name, phone });

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

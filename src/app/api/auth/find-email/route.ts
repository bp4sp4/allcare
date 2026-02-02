import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: 이름과 전화번호로 사용자 조회
    // const user = await db.users.findFirst({
    //   where: {
    //     name,
    //     phone
    //   }
    // });

    // if (!user) {
    //   return NextResponse.json(
    //     { error: '일치하는 사용자를 찾을 수 없습니다.' },
    //     { status: 404 }
    //   );
    // }

    console.log(`Find email: ${name}, ${phone}`);

    return NextResponse.json({
      success: true,
      email: 'user@example.com', // TODO: 실제 이메일 반환
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

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// TODO: 이메일 발송 서비스 연동
// import { sendEmail } from '@/lib/email';

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

    // TODO: 사용자 존재 확인
    // const user = await db.users.findUnique({
    //   where: { email }
    // });

    // if (!user) {
    //   return NextResponse.json(
    //     { error: '존재하지 않는 이메일입니다.' },
    //     { status: 404 }
    //   );
    // }

    // 재설정 토큰 생성
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    // TODO: 토큰 저장
    // await db.passwordResetTokens.create({
    //   data: {
    //     userId: user.id,
    //     token,
    //     expiresAt,
    //     used: false
    //   }
    // });

    // TODO: 이메일 발송
    const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password?token=${token}`;
    // await sendEmail(email, '비밀번호 재설정', `비밀번호 재설정 링크: ${resetUrl}`);

    console.log(`Password reset for ${email}. Token: ${token}`);
    console.log(`Reset URL: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
      // 개발 환경에서만 토큰 반환
      ...(process.env.NODE_ENV === 'development' && { token })
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

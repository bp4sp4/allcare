import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword, newPasswordConfirm } = body;

    if (!token || !newPassword || !newPasswordConfirm) {
      return NextResponse.json(
        { error: '모든 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword !== newPasswordConfirm) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // TODO: 토큰 확인
    // const resetToken = await db.passwordResetTokens.findUnique({
    //   where: { token },
    //   include: { user: true }
    // });

    // if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    //   return NextResponse.json(
    //     { error: '유효하지 않거나 만료된 토큰입니다.' },
    //     { status: 400 }
    //   );
    // }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // TODO: 비밀번호 업데이트
    // await db.users.update({
    //   where: { id: resetToken.userId },
    //   data: { passwordHash }
    // });

    // TODO: 토큰 사용 처리
    // await db.passwordResetTokens.update({
    //   where: { id: resetToken.id },
    //   data: { used: true }
    // });

    console.log(`Password reset confirmed with token: ${token}`);

    return NextResponse.json({
      success: true,
      message: '비밀번호가 재설정되었습니다.'
    });

  } catch (error) {
    console.error('Reset password confirm error:', error);
    return NextResponse.json(
      { error: '비밀번호 재설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

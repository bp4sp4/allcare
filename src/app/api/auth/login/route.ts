import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// TODO: 실제 데이터베이스 연결
// import { db } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

    // TODO: 데이터베이스에서 사용자 조회
    // const user = await db.users.findUnique({
    //   where: { email }
    // });
    
    // if (!user) {
    //   return NextResponse.json(
    //     { error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
    //     { status: 401 }
    //   );
    // }

    // if (!user.isActive) {
    //   return NextResponse.json(
    //     { error: '비활성화된 계정입니다.' },
    //     { status: 403 }
    //   );
    // }

    // TODO: 비밀번호 확인
    // const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    // if (!isValidPassword) {
    //   return NextResponse.json(
    //     { error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
    //     { status: 401 }
    //   );
    // }

    // TODO: 마지막 로그인 시간 업데이트
    // await db.users.update({
    //   where: { id: user.id },
    //   data: { lastLogin: new Date() }
    // });

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: 'temp-user-id',
        email: email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('User login:', email);

    return NextResponse.json({
      success: true,
      message: '로그인 성공',
      token,
      user: {
        id: 'temp-user-id',
        email: email,
        name: '테스트 사용자'
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

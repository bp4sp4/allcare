import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function GET(req: NextRequest) {
  try {
    // 토큰에서 사용자 ID 가져오기
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 검증
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // public.users 테이블에서 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name, phone, provider')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('User data fetch error:', userError);
      return NextResponse.json(
        { error: '사용자 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // users 테이블에 데이터가 없으면 JWT 토큰의 정보 사용
    if (!userData) {
      return NextResponse.json({
        email: decoded.email,
        name: '사용자',
        phone: '',
        provider: decoded.provider || 'email'
      });
    }

    return NextResponse.json({
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      provider: userData.provider || 'email'
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

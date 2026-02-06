import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 토큰에서 사용자 ID 가져오기
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const userId = decoded.userId;
    const userEmail = decoded.email;

    // 이메일 기반 가입자는 비밀번호 확인 (선택)
    if (decoded.provider === 'email' && body.password) {
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: body.password
      });

      if (signInError) {
        return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 400 });
      }
    }

    // users 테이블에서 데이터 삭제
    const { error: deleteUserRowError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserRowError) {
      console.error('Failed to delete user row:', deleteUserRowError);
      // 계속 진행해도 무방
    }

    // Supabase Auth 사용자 삭제 (Admin)
    try {
      // admin API - 삭제
      // @ts-ignore
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error('Auth delete error:', authDeleteError);
        return NextResponse.json({ error: '계정 삭제에 실패했습니다.' }, { status: 500 });
      }
    } catch (err) {
      console.error('Auth admin delete failed:', err);
      return NextResponse.json({ error: '계정 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '계정이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete account API error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

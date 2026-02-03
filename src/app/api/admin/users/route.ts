import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// JWT 토큰 검증 및 관리자 권한 확인
function verifyAdminToken(authHeader: string | null): { userId: string; email: string; role: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded.isAdmin) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const authHeader = request.headers.get('authorization');
    const admin = verifyAdminToken(authHeader);

    if (!admin) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    // URL 파라미터에서 필터 조건 추출
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const provider = searchParams.get('provider') || 'all';
    const subscription = searchParams.get('subscription') || 'all';

    // admin_user_details 뷰에서 회원 정보 조회
    let query = supabaseAdmin.from('admin_user_details').select('*');

    // 검색 필터 (이메일, 이름, 전화번호)
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // 가입 경로 필터
    if (provider !== 'all') {
      query = query.eq('provider', provider);
    }

    // 구독 상태 필터
    if (subscription === 'active') {
      query = query.eq('subscription_status', 'active').is('cancelled_at', null);
    } else if (subscription === 'cancelled') {
      query = query.eq('subscription_status', 'active').not('cancelled_at', 'is', null);
    } else if (subscription === 'none') {
      query = query.is('subscription_status', null);
    }

    // 최신 가입자부터 정렬
    query = query.order('registered_at', { ascending: false });

    const { data: users, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: '회원 목록을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: users || []
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

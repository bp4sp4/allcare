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
    // cancel_scheduled: VIEW가 반환 못 할 수 있으므로 필터 미적용 후 코드에서 처리

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

    // 관리자 계정 목록 조회
    const { data: adminUsers } = await supabaseAdmin
      .from('admin_users')
      .select('email');

    const adminEmails = new Set(adminUsers?.map(admin => admin.email) || []);

    // 관리자 계정을 제외한 회원 목록만 반환
    const filteredUsers = users?.filter(user => !adminEmails.has(user.email)) || [];

    const userIds = filteredUsers.map((u: any) => u.user_id);

    // practice_matching_access 조회 후 병합
    let accessMap = new Map<string, boolean>();
    // cancel_scheduled 상태 보완 (VIEW가 cancel_scheduled를 반환하지 않는 경우 대비)
    let subscriptionStatusMap = new Map<string, string>();

    if (userIds.length > 0) {
      const [accessResult, subscriptionResult] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('id, practice_matching_access')
          .in('id', userIds),
        supabaseAdmin
          .from('subscriptions')
          .select('user_id, status')
          .in('user_id', userIds)
          .in('status', ['active', 'cancel_scheduled'])
          .order('created_at', { ascending: false }),
      ]);

      accessResult.data?.forEach((u: any) => accessMap.set(u.id, u.practice_matching_access ?? false));

      // 유저별 가장 최근 구독 상태 저장 (VIEW가 null 반환할 때 사용)
      const seenUserIds = new Set<string>();
      subscriptionResult.data?.forEach((s: any) => {
        if (!seenUserIds.has(s.user_id)) {
          subscriptionStatusMap.set(s.user_id, s.status);
          seenUserIds.add(s.user_id);
        }
      });
    }

    const usersWithAccess = filteredUsers.map((u: any) => ({
      ...u,
      // VIEW의 subscription_status가 null이면 subscriptions 테이블에서 보완
      subscription_status: u.subscription_status ?? subscriptionStatusMap.get(u.user_id) ?? null,
      practice_matching_access: accessMap.get(u.user_id) ?? false,
    }));

    // cancel_scheduled 필터는 status 보완 후 후처리 적용
    const finalUsers = subscription === 'cancel_scheduled'
      ? usersWithAccess.filter((u: any) => u.subscription_status === 'cancel_scheduled')
      : usersWithAccess;

    return NextResponse.json({
      success: true,
      users: finalUsers
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

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

// JWT 토큰 검증
function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.isAdmin === true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const authHeader = request.headers.get('authorization');
    if (!verifyAdminToken(authHeader)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    // 전체 회원 수
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 활성 구독 수 (취소되지 않은 것)
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('cancelled_at', null);

    // 취소된 구독 수
    const { count: cancelledSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('cancelled_at', 'is', null);

    // 구독 매출 (payments 테이블에서 정기구독 완료건 합계)
    const { data: subPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .not('order_id', 'like', 'PKG-%');

    const subscriptionRevenue = subPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // 패키지 매출 (order_id가 PKG-로 시작하는 완료건 합계)
    const { data: pkgPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .like('order_id', 'PKG-%');

    const packageRevenue = pkgPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      cancelledSubscriptions: cancelledSubscriptions || 0,
      totalRevenue: subscriptionRevenue + packageRevenue,
      subscriptionRevenue,
      packageRevenue,
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: '통계를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}

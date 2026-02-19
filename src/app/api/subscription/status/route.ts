import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

    // 구독 정보 조회 (active 또는 cancel_scheduled 상태)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancel_scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json(
        { error: '구독 정보를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 구독이 없는 경우
    if (!subscription) {
      return NextResponse.json({
        isActive: false
      });
    }

    // 다음 결제 예정금액 계산 (예약된 플랜이 있으면 해당 금액, 없으면 현재 금액)
    const nextAmount = subscription.scheduled_amount ?? subscription.amount;

    // 구독이 있는 경우
    return NextResponse.json({
      isActive: true,
      id: subscription.id,
      plan: subscription.plan,
      amount: subscription.amount,
      startDate: new Date(subscription.start_date).toLocaleDateString('ko-KR'),
      nextBillingDate: subscription.next_billing_date
        ? new Date(subscription.next_billing_date).toLocaleDateString('ko-KR')
        : null,
      endDate: subscription.end_date
        ? new Date(subscription.end_date).toLocaleDateString('ko-KR')
        : null,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      cancelled_at: subscription.cancelled_at,
      scheduledPlan: subscription.scheduled_plan || null,
      scheduledAmount: subscription.scheduled_amount || null,
      nextAmount: nextAmount,
    });

  } catch (error) {
    console.error('Subscription status API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

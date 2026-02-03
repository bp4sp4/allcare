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

    // 구독 정보 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
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

    // 구독이 있는 경우
    return NextResponse.json({
      isActive: true,
      plan: subscription.plan,
      amount: subscription.amount,
      startDate: new Date(subscription.start_date).toLocaleDateString('ko-KR'),
      nextBillingDate: subscription.next_billing_date 
        ? new Date(subscription.next_billing_date).toLocaleDateString('ko-KR')
        : null,
      billingCycle: subscription.billing_cycle,
      status: subscription.status
    });

  } catch (error) {
    console.error('Subscription status API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

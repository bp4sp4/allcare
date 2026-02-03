import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

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

    // 구독 내역 조회 (payments 테이블이 없으므로 subscriptions에서 조회)
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payment history error:', error);
      return NextResponse.json(
        { error: '결제 내역을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    // 결제 내역 포맷팅
    const paymentHistory = subscriptions?.map(sub => ({
      id: sub.id,
      date: sub.created_at,
      plan: sub.plan,
      amount: sub.amount,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      startDate: sub.start_date,
      nextBillingDate: sub.next_billing_date,
      cancelledAt: sub.cancelled_at,
      paymentMethod: sub.payment_method_name || '자동결제', // 실제 결제수단
    })) || [];

    return NextResponse.json({
      success: true,
      payments: paymentHistory
    });

  } catch (error) {
    console.error('Payment history API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

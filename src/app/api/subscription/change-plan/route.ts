import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelRebill } from '@/lib/payapp';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PAYAPP_USER_ID = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
const PAYAPP_LINK_KEY = process.env.PAYAPP_LINK_KEY || '';

const PLAN_MAP: Record<string, { name: string; price: number; rank: number }> = {
  basic: { name: '베이직', price: 9900, rank: 1 },
  standard: { name: '스탠다드', price: 19900, rank: 2 },
  premium: { name: '프리미엄', price: 29900, rank: 3 },
};

function getPlanRank(planName: string): number {
  const entry = Object.values(PLAN_MAP).find((p) => p.name === planName);
  return entry?.rank ?? 0;
}

function getPlanPrice(planName: string): number {
  const entry = Object.values(PLAN_MAP).find((p) => p.name === planName);
  return entry?.price ?? 0;
}

/**
 * 현재 플랜의 남은 기간 일할 환불 금액 계산
 * currentPrice ÷ 전체기간일수 × 남은일수
 */
function calculateRemainingRefund(currentPrice: number, nextBillingDate: string): number {
  const now = new Date();
  const nextDate = new Date(nextBillingDate);

  if (nextDate <= now) return 0;

  const prevDate = new Date(nextDate);
  prevDate.setMonth(prevDate.getMonth() - 1);

  const totalMs = nextDate.getTime() - prevDate.getTime();
  const totalDays = Math.max(Math.ceil(totalMs / (1000 * 60 * 60 * 24)), 1);

  const remainingMs = nextDate.getTime() - now.getTime();
  const remainingDays = Math.max(Math.ceil(remainingMs / (1000 * 60 * 60 * 24)), 0);

  return Math.round(currentPrice * remainingDays / totalDays);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

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
    const body = await req.json();
    const { plan } = body;

    if (!plan || !PLAN_MAP[plan]) {
      return NextResponse.json(
        { error: '유효하지 않은 요금제입니다.' },
        { status: 400 }
      );
    }

    // 현재 활성 구독 조회
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancel_scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '활성 구독이 없습니다.' },
        { status: 404 }
      );
    }

    const newPlanInfo = PLAN_MAP[plan];
    const currentPrice = subscription.amount || getPlanPrice(subscription.plan);
    const currentRank = getPlanRank(subscription.plan);
    const newRank = newPlanInfo.rank;

    // 현재 플랜과 동일하면 예약 취소
    if (subscription.plan === newPlanInfo.name) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          scheduled_plan: null,
          scheduled_amount: null,
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Schedule clear error:', updateError);
        return NextResponse.json(
          { error: '예약 취소 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'cancel',
        message: '요금제 변경 예약이 취소되었습니다.',
        scheduledPlan: null,
        scheduledAmount: null,
        needsPayment: false,
      });
    }

    // ========== 업그레이드 (더 비싼 플랜) ==========
    if (newRank > currentRank) {

      // 1. 기존 정기결제(rebill) 해지
      if (subscription.payapp_bill_key && PAYAPP_USER_ID && PAYAPP_LINK_KEY) {
        const cancelResult = await cancelRebill({
          userId: PAYAPP_USER_ID,
          linkKey: PAYAPP_LINK_KEY,
          rebillNo: subscription.payapp_bill_key,
        });

        if (!cancelResult.success) {
          console.error('PayApp rebill cancel failed:', cancelResult.error);
          return NextResponse.json(
            { error: '기존 정기결제 해지에 실패했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
          );
        }
      }

      // 2. 잔여 환불금액 계산 (실제 환불은 새 결제 완료 후 webhook에서 처리)
      let refundAmount = 0;
      const refundTradeId = subscription.payapp_trade_id || null;

      if (subscription.next_billing_date) {
        refundAmount = calculateRemainingRefund(currentPrice, subscription.next_billing_date);
      }

      // 3. bill_key null 초기화 (플랜/trade_id는 결제 완료 webhook에서 업데이트)
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          payapp_bill_key: null,
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Upgrade DB update error:', updateError);
        return NextResponse.json(
          { error: '요금제 변경 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }

      // 4. 클라이언트에서 새 금액(전액)으로 rebill 재등록
      // 환불 정보는 var1에 담아 webhook으로 전달
      return NextResponse.json({
        success: true,
        type: 'upgrade',
        message: `${newPlanInfo.name}으로 업그레이드합니다.`,
        refundAmount,
        refundTradeId,
        prevPrice: currentPrice,
        newPlanName: newPlanInfo.name,
        newPlanPrice: newPlanInfo.price,
        needsPayment: true,
      });
    }

    // ========== 다운그레이드 (더 싼 플랜) ==========
    // 즉시 결제 없이 다음 결제일부터 적용
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        scheduled_plan: newPlanInfo.name,
        scheduled_amount: newPlanInfo.price,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Downgrade schedule error:', updateError);
      return NextResponse.json(
        { error: '요금제 변경 예약 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // payments 테이블에 플랜 변경 예약 이벤트 기록
    await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        order_id: `planchange-${subscription.id}-${Date.now()}`,
        amount: newPlanInfo.price,
        status: 'plan_change',
        good_name: `${subscription.plan} → ${newPlanInfo.name} 변경 예약`,
        payment_method: 'internal',
        approved_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      type: 'downgrade',
      message: `다음 결제일부터 ${newPlanInfo.name}(월 ${newPlanInfo.price.toLocaleString()}원)으로 변경됩니다.`,
      scheduledPlan: newPlanInfo.name,
      scheduledAmount: newPlanInfo.price,
      needsPayment: false,
    });

  } catch (error) {
    console.error('Plan change API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(req: NextRequest) {
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

    // 취소된 구독 조회
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('cancelled_at', 'is', null)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '재갱신 가능한 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 구독 재갱신: cancelled_at과 end_date를 null로 설정
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancelled_at: null,
        end_date: null,
        // status는 이미 active이므로 그대로 유지
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Subscription renew error:', updateError);
      return NextResponse.json(
        { error: '구독 재갱신에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 재갱신되었습니다. 다음 결제일부터 자동 결제가 재개됩니다.',
      nextBillingDate: subscription.next_billing_date
    });

  } catch (error) {
    console.error('Renew subscription API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

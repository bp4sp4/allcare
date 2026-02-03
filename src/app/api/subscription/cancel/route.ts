import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelRebill } from '@/lib/payapp';
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

    // 활성 구독 조회
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: '활성 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // PayApp 정기결제 해지 (다음 결제 주기에 자동 결제 안 됨)
    if (subscription.payapp_bill_key) {
      const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
      const linkKey = process.env.PAYAPP_LINK_KEY || '';

      if (!payappUserId || !linkKey) {
        console.error('PayApp credentials not configured');
        return NextResponse.json(
          { error: 'PayApp 설정이 올바르지 않습니다.' },
          { status: 500 }
        );
      }

      const rebillCancelResult = await cancelRebill({
        userId: payappUserId,
        linkKey,
        rebillNo: subscription.payapp_bill_key,
      });

      if (!rebillCancelResult.success) {
        console.error('PayApp rebill cancel failed:', rebillCancelResult.error);
        // 실패해도 계속 진행 (DB에서는 취소 처리)
      }
    }

    // 구독 상태 업데이트: 다음 결제일까지만 사용 가능하도록 설정
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancel_scheduled', // 구독취소 상태로 변경
        cancelled_at: new Date().toISOString(),
        end_date: subscription.next_billing_date, // 다음 결제일까지 사용 가능
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Subscription cancel error:', updateError);
      return NextResponse.json(
        { error: '구독 취소에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 다음 결제일 계산
    const endDate = new Date(subscription.next_billing_date);
    const daysRemaining = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      success: true,
      message: `구독이 취소되었습니다. ${endDate.toLocaleDateString('ko-KR')}까지 계속 이용하실 수 있습니다.`,
      endDate: subscription.next_billing_date,
      daysRemaining
    });

  } catch (error) {
    console.error('Cancel subscription API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

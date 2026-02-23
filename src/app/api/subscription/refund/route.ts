import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelPayment, requestPaymentCancellation } from '@/lib/payapp';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(req: NextRequest) {
  try {
    const { reason } = await req.json();

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


    // 활성 또는 취소예정 구독 조회
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
        { error: '활성 구독을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 구독 시작 후 경과 일수 계산
    const startDate = new Date(subscription.start_date);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // PayApp 환불 처리 (실제로 돈을 돌려줌)
    if (subscription.payapp_trade_id) {
      const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
      const linkKey = process.env.PAYAPP_LINK_KEY || '';

      if (!payappUserId || !linkKey) {
        console.error('PayApp credentials not configured');
        return NextResponse.json(
          { error: 'PayApp 설정이 올바르지 않습니다.' },
          { status: 500 }
        );
      }

      const cancelMemo = reason ? `환불 요청 - ${reason}` : '사용자 환불 요청';

      // D+5일 이내면 즉시 취소, 이후면 취소 요청
      if (daysSinceStart <= 5) {
        // 즉시 환불 (전액)
        const cancelResult = await cancelPayment({
          userId: payappUserId,
          linkKey,
          mulNo: subscription.payapp_trade_id,
          cancelMemo,
          partCancel: 0, // 전체 취소
        });

        if (!cancelResult.success) {
          return NextResponse.json(
            { error: cancelResult.error || '환불 처리에 실패했습니다.' },
            { status: 400 }
          );
        }
      } else {
        // 취소 요청 (정산 후)
        const cancelReqResult = await requestPaymentCancellation({
          userId: payappUserId,
          linkKey,
          mulNo: subscription.payapp_trade_id,
          cancelMemo,
          partCancel: 0,
        });

        if (!cancelReqResult.success) {
          return NextResponse.json(
            { error: cancelReqResult.error || '환불 요청에 실패했습니다.' },
            { status: 400 }
          );
        }

        // 구독 즉시 종료
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            end_date: new Date().toISOString()
          })
          .eq('id', subscription.id);

        // payments 테이블에 환불 요청 이벤트 기록
        await supabaseAdmin
          .from('payments')
          .insert({
            user_id: userId,
            order_id: `refund-${subscription.id}-${Date.now()}`,
            amount: subscription.amount || 0,
            status: 'refund_requested',
            good_name: `${subscription.plan} 환불 요청`,
            payment_method: 'internal',
            approved_at: new Date().toISOString(),
          });

        // 취소 요청의 경우 관리자 확인이 필요함을 알림
        return NextResponse.json({
          success: true,
          message: '환불 요청이 접수되었습니다. 정산 후 환불 처리되므로 영업일 기준 3-5일이 소요될 수 있습니다.',
          requiresManualProcessing: true,
          refundInfo: cancelReqResult.data
        });
      }
    }

    // 환불 완료: 구독 즉시 종료
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        end_date: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Subscription cancel error:', updateError);
      return NextResponse.json(
        { error: '환불 처리에 실패했습니다.' },
        { status: 500 }
      );
    }

    // payments 테이블에 환불 완료 이벤트 기록
    await supabaseAdmin
      .from('payments')
      .insert({
        user_id: userId,
        order_id: `refund-${subscription.id}-${Date.now()}`,
        amount: subscription.amount || 0,
        status: 'refunded',
        good_name: `${subscription.plan} 환불`,
        payment_method: 'internal',
        approved_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: '환불이 완료되었습니다. 영업일 기준 3-5일 내에 결제 수단으로 환불됩니다. 구독은 즉시 종료됩니다.'
    });

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cancelPayment } from '@/lib/payapp';
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
    const { data: subscription, error: subError } = await supabase
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

    // PayApp 결제 취소 API 호출
    if (subscription.payapp_trade_id) {
      const userId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
      const linkKey = process.env.PAYAPP_LINK_KEY || '';

      if (!userId || !linkKey) {
        console.error('PayApp credentials not configured');
        return NextResponse.json(
          { error: 'PayApp 설정이 올바르지 않습니다.' },
          { status: 500 }
        );
      }

      const cancelResult = await cancelPayment({
        userId,
        linkKey,
        mulNo: subscription.payapp_trade_id,
        cancelMemo: '사용자 구독 취소 요청',
        partCancel: 0, // 전체 취소
      });

      if (!cancelResult.success) {
        // PayApp 취소 실패 시 에러 반환
        return NextResponse.json(
          { error: cancelResult.error || '결제 취소에 실패했습니다.' },
          { status: 400 }
        );
      }
    }

    // 구독 상태를 'cancelled'로 업데이트
    const { error: updateError } = await supabase
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
        { error: '구독 취소에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다.'
    });

  } catch (error) {
    console.error('Cancel subscription API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

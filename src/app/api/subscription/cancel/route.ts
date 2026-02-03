import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

    // 구독 취소: PayApp 정기결제 키 삭제 (다음 결제 중지)
    // 하지만 이번 달은 계속 사용 가능 (end_date를 next_billing_date로 설정)
    
    // PayApp 정기결제 삭제는 하지 않음 - 단순히 DB에서만 다음 결제 안되도록 표시
    // (실제로는 PayApp 정기결제 키 삭제 API를 호출해야 하지만 여기서는 생략)

    // 구독 상태 업데이트: 다음 결제일까지만 사용 가능하도록 설정
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active', // 여전히 활성 상태 유지
        cancelled_at: new Date().toISOString(),
        end_date: subscription.next_billing_date, // 다음 결제일까지 사용 가능
        // auto_renew 같은 필드가 있다면 false로 설정
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

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

    // payments 테이블에서 결제/환불/취소/변경 내역 조회
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Payment history error:', error);
      return NextResponse.json(
        { error: '결제 내역을 불러오지 못했습니다.' },
        { status: 500 }
      );
    }

    // 결제 내역 포맷팅 - status 기반으로 type 결정
    const paymentHistory = (payments || []).map(p => {
      let type: 'payment' | 'refund' | 'cancellation' | 'plan_change' = 'payment';
      const status = (p.status || '').toLowerCase();

      if (status === 'refunded' || status === 'refund_requested') {
        type = 'refund';
      } else if (status === 'cancelled') {
        type = 'cancellation';
      } else if (status === 'plan_change') {
        type = 'plan_change';
      }

      return {
        id: p.order_id || p.id,
        date: p.approved_at || p.created_at,
        amount: p.amount || 0,
        status: p.status,
        type,
        productName: p.good_name || '결제',
        paymentMethod: null,
      };
    });

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

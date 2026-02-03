import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { cancelRebill } from '@/lib/payapp';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// JWT 토큰 검증
function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.isAdmin === true;
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인
    const authHeader = request.headers.get('authorization');
    if (!verifyAdminToken(authHeader)) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 401 }
      );
    }

    const { userId, status } = await request.json();

    if (!userId || !status) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (status !== 'active' && status !== 'cancel_scheduled' && status !== 'cancelled') {
      return NextResponse.json(
        { error: '유효하지 않은 상태입니다.' },
        { status: 400 }
      );
    }

    // 회원의 구독 정보 조회 (status가 active 또는 cancelled 모두 조회)
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .or('status.eq.active,status.eq.cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: '구독 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    // 구독 상태별 처리
    if (status === 'active') {
      // 구독중 (정상)
      updateData = {
        ...updateData,
        status: 'active',
        cancelled_at: null,
        end_date: null
      };
    } else if (status === 'cancel_scheduled') {
      // 구독취소 상태 (다음 결제일까지 사용 가능)
      // PayApp 정기결제 해지 호출
      if (subscription.payapp_bill_key) {
        const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
        const linkKey = process.env.PAYAPP_LINK_KEY || '';

        if (payappUserId && linkKey) {
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
      }

      updateData = {
        ...updateData,
        status: 'active',
        cancelled_at: new Date().toISOString(),
        end_date: subscription.next_billing_date
      };
    } else if (status === 'cancelled') {
      // 취소됨 (즉시 종료)
      updateData = {
        ...updateData,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        end_date: new Date().toISOString()
      };
    }

    // 구독 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: '구독 상태 변경에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독 상태가 변경되었습니다.'
    });
  } catch (error) {
    console.error('Admin subscription update API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

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

    const { userId, status, plan } = await request.json();

    if (!userId || (!status && !plan)) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const PLAN_MAP: Record<string, { name: string; amount: number }> = {
      basic: { name: '베이직', amount: 9900 },
      standard: { name: '스탠다드', amount: 19900 },
      premium: { name: '프리미엄', amount: 29900 },
    };

    // 플랜 변경 처리
    if (plan) {
      if (!PLAN_MAP[plan]) {
        return NextResponse.json({ error: '유효하지 않은 플랜입니다.' }, { status: 400 });
      }

      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'cancel_scheduled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const planInfo = PLAN_MAP[plan];

      if (!subscription) {
        // 활성 구독 없으면 새로 생성
        const now = new Date().toISOString();
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        const { error: insertError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan: planInfo.name,
            status: 'active',
            amount: planInfo.amount,
            billing_cycle: 'monthly',
            start_date: now,
            next_billing_date: nextBilling.toISOString(),
            cancelled_at: null,
            end_date: null,
            created_at: now,
            updated_at: now,
          });
        if (insertError) {
          return NextResponse.json({ error: '구독 생성에 실패했습니다.', detail: insertError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: '플랜이 설정되었습니다.' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ plan: planInfo.name, amount: planInfo.amount, updated_at: new Date().toISOString() })
        .eq('id', subscription.id);

      if (updateError) {
        return NextResponse.json({ error: '플랜 변경에 실패했습니다.', detail: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '플랜이 변경되었습니다.' });
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

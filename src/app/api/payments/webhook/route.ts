import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 페이앱 웹훅 처리 (결제 결과 수신)
export async function POST(request: NextRequest) {
  try {
    // 페이앱은 form-urlencoded 또는 JSON으로 데이터 전송
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // form-urlencoded 파싱
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        body[key] = value;
      });
    }

    // 페이앱 응답 파라미터 (실제 PayApp이 보내는 형식)
    const {
      pay_state,    // 결제 상태 (4: 결제완료)
      mul_no,       // 거래번호
      price,        // 결제금액
      goodname,     // 상품명
      recvphone,    // 받는사람 전화번호
      var1,         // 주문 데이터 (JSON)
      pay_date,     // 승인시간
      rebill_no,    // 정기결제 키
      pay_type,     // 결제수단 (1=신용카드, 6=계좌이체, 15=카카오페이, 16=네이버페이, 25=토스페이)
      card_name,    // 신용카드명
      naverpay,     // 네이버결제 구분 ('card' 또는 'bank')
      vbank         // 은행명 (가상계좌 결제 시)
    } = body;

    // 결제 성공 시 (pay_state === '4'는 결제완료)
    if (pay_state === '4') {

      // 결제수단 이름 변환
      const getPaymentMethodName = (payType: string, cardName?: string, naverpay?: string, vbank?: string) => {
        const type = parseInt(payType);
        switch (type) {
          case 1:
            if (cardName) return `${cardName}`;
            return '신용카드';
          case 2:
            return '휴대전화';
          case 4:
            return '대면결제';
          case 6:
            return '계좌이체';
          case 7:
            if (vbank) return `가상계좌 (${vbank})`;
            return '가상계좌';
          case 15:
            return '카카오페이';
          case 16:
            if (naverpay === 'card') return '네이버페이 (카드)';
            if (naverpay === 'bank') return '네이버페이 (계좌)';
            return '네이버페이';
          case 17:
            return '등록결제';
          case 21:
            return '스마일페이';
          case 23:
            return '애플페이';
          case 24:
            return '내통장결제';
          case 25:
            return '토스페이';
          default:
            return '자동결제';
        }
      };

      const paymentMethodName = getPaymentMethodName(pay_type, card_name, naverpay, vbank);

      // var1에서 user_id 추출
      let userId = null;
      let orderData: any = {};

      try {
        if (var1) {
          try {
            orderData = JSON.parse(var1);
            userId = orderData.userId;
          } catch (e) {
            orderData = { orderId: var1 };
          }
        }
      } catch (err) {
        // var1 parse failed
      }

      // userId가 없으면 전화번호로 찾기
      if (!userId && recvphone) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', recvphone)
          .maybeSingle();

        if (userData) {
          userId = userData.id;
        }
      }

      if (userId) {
        // 결제 수단 변경 모드인지 확인
        const isChangeMode = orderData.mode === 'change-payment';

        // 구독 정보 생성 또는 업데이트
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        const subscriptionData = {
          user_id: userId,
          plan: 'premium',
          status: 'active',
          amount: parseInt(price),
          billing_cycle: 'monthly',
          start_date: new Date().toISOString(),
          next_billing_date: nextBillingDate.toISOString(),
          payapp_bill_key: rebill_no,
          payapp_trade_id: mul_no,
          payment_type: pay_type ? parseInt(pay_type) : null,
          card_name: card_name || null,
          payment_method_name: paymentMethodName
        };

        // 기존 활성 구독이 있는지 확인 (active 또는 cancel_scheduled)
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', userId)
          .in('status', ['active', 'cancel_scheduled'])
          .maybeSingle();

        if (existingSub) {
          if (isChangeMode) {
            // 결제 수단 변경: bill_key, trade_id, 결제 정보만 업데이트
            const { error: subscriptionError } = await supabaseAdmin
              .from('subscriptions')
              .update({
                payapp_bill_key: rebill_no,
                payapp_trade_id: mul_no,
                payment_type: pay_type ? parseInt(pay_type) : null,
                card_name: card_name || null,
                payment_method_name: paymentMethodName
              })
              .eq('id', existingSub.id)
              .select();

            if (subscriptionError) {
              console.error('Payment method update error:', subscriptionError);
            }
          } else {
            // 일반 업데이트: 전체 구독 정보 업데이트
            const { error: subscriptionError } = await supabaseAdmin
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSub.id)
              .select();

            if (subscriptionError) {
              console.error('Subscription update error:', subscriptionError);
            }
          }
        } else {
          // 새 구독 생성
          const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .insert(subscriptionData)
            .select();

          if (subscriptionError) {
            console.error('Subscription creation error:', subscriptionError);
          }
        }

        // users 테이블에 이름/전화번호 업데이트
        if (orderData.name || orderData.phone) {
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .maybeSingle();

          const updateData: any = { id: userId };
          updateData.email = existingUser?.email || '';

          if (orderData.name) {
            updateData.name = orderData.name;
          }
          if (orderData.phone) {
            updateData.phone = orderData.phone;
          }

          const { error: userUpdateError } = await supabaseAdmin
            .from('users')
            .upsert(updateData, {
              onConflict: 'id'
            });

          if (userUpdateError) {
            console.error('Users table update error:', userUpdateError);
          }
        }
      }

      // 결제 내역 저장
      await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          order_id: orderData.orderId || `ORDER-${Date.now()}`,
          trade_id: mul_no,
          amount: parseInt(price),
          good_name: goodname,
          customer_phone: recvphone,
          status: 'completed',
          payment_method: 'payapp',
          approved_at: pay_date ? new Date(pay_date).toISOString() : new Date().toISOString()
        });

    } else {
      // 결제 실패 내역 저장
      await supabaseAdmin
        .from('payments')
        .insert({
          order_id: var1 || `ORDER-${Date.now()}`,
          trade_id: mul_no,
          amount: parseInt(price) || 0,
          good_name: goodname || 'Unknown',
          customer_phone: recvphone,
          status: 'failed',
          payment_method: 'payapp',
          error_code: pay_state,
          error_message: '결제 상태: ' + pay_state
        });
    }

    // 페이앱은 응답으로 'SUCCESS' 문자열을 기대함 (에러코드 70080 방지)
    return new NextResponse('SUCCESS', { status: 200 });

  } catch (error) {
    console.error('PayApp webhook error:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}

// GET 요청도 처리 (페이앱이 GET으로 보낼 수도 있음)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const body: any = {};
    searchParams.forEach((value, key) => {
      body[key] = value;
    });

    const { RETURNCODE } = body;

    if (RETURNCODE === '0000') {
      // Payment success via GET
    }

    return new NextResponse('SUCCESS', { status: 200 });

  } catch (error) {
    console.error('PayApp webhook GET error:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}

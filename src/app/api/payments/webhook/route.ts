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
    
    console.log('PayApp webhook received:', body);

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
      console.log('Payment success:', {
        tradeId: mul_no,
        amount: price,
        goodName: goodname,
        approvedAt: pay_date,
        billKey: rebill_no,
        payType: pay_type,
        cardName: card_name,
        naverpay: naverpay,
        vbank: vbank,
        var1
      });

      // 결제수단 이름 변환
      const getPaymentMethodName = (payType: string, cardName?: string, naverpay?: string, vbank?: string) => {
        const type = parseInt(payType);
        switch (type) {
          case 1:
            if (cardName) return `${cardName}`; // 예: "삼성카드"
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

      console.log('=== var1 파싱 시작 ===');
      console.log('var1 원본:', var1);
      console.log('var1 타입:', typeof var1);

      try {
        // var1이 JSON 형태인 경우 파싱
        if (var1) {
          try {
            orderData = JSON.parse(var1);
            userId = orderData.userId;
            console.log('var1 파싱 성공:', orderData);
            console.log('추출된 userId:', userId);
          } catch (e) {
            // JSON이 아닌 경우 orderId로만 사용
            console.log('var1 JSON 파싱 실패, 문자열로 처리:', e);
            orderData = { orderId: var1 };
          }
        }
      } catch (err) {
        console.error('var1 parse error:', err);
      }

      console.log('최종 userId:', userId);
      console.log('최종 orderData:', orderData);

      // userId가 없으면 전화번호로 찾기
      if (!userId && recvphone) {
        console.log('userId 없음, 전화번호로 찾기:', recvphone);
        const { data: userData, error: userFindError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', recvphone)
          .maybeSingle();

        console.log('전화번호로 찾은 사용자:', userData);
        console.log('사용자 조회 에러:', userFindError);

        if (userData) {
          userId = userData.id;
          console.log('전화번호로 찾은 userId:', userId);
        }
      }

      // userId가 있으면 구독 정보 저장
      console.log('구독 저장 시작, userId:', userId);
      console.log('orderData:', orderData);
      
      if (userId) {
        // 결제 수단 변경 모드인지 확인
        const isChangeMode = orderData.mode === 'change-payment';
        console.log('결제 수단 변경 모드:', isChangeMode);

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

        console.log('구독 데이터:', subscriptionData);

        // 기존 활성 구독이 있는지 확인 (active 또는 cancel_scheduled)
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', userId)
          .in('status', ['active', 'cancel_scheduled'])
          .maybeSingle();

        if (existingSub) {
          // 기존 구독이 있으면 업데이트
          if (isChangeMode) {
            // 결제 수단 변경: bill_key, trade_id, 결제 정보만 업데이트
            console.log('결제 수단만 업데이트:', existingSub.id);
            const { data: subscriptionResult, error: subscriptionError } = await supabaseAdmin
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
              console.error('❌ Payment method update error:', subscriptionError);
            } else {
              console.log('✅ Payment method updated for user:', userId);
              console.log('업데이트된 구독 데이터:', subscriptionResult);
            }
          } else {
            // 일반 업데이트: 전체 구독 정보 업데이트
            console.log('전체 구독 정보 업데이트:', existingSub.id);
            const { data: subscriptionResult, error: subscriptionError } = await supabaseAdmin
              .from('subscriptions')
              .update(subscriptionData)
              .eq('id', existingSub.id)
              .select();

            if (subscriptionError) {
              console.error('❌ Subscription update error:', subscriptionError);
            } else {
              console.log('✅ Subscription updated for user:', userId);
              console.log('업데이트된 구독 데이터:', subscriptionResult);
            }
          }
        } else {
          // 새 구독 생성
          const { data: subscriptionResult, error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .insert(subscriptionData)
            .select();

          if (subscriptionError) {
            console.error('❌ Subscription creation error:', subscriptionError);
            console.error('에러 상세:', JSON.stringify(subscriptionError, null, 2));
          } else {
            console.log('✅ Subscription created for user:', userId);
            console.log('저장된 구독 데이터:', subscriptionResult);
          }
        }

        // users 테이블에 이름/전화번호 업데이트 (결제 폼에서 입력한 데이터)
        if (orderData.name || orderData.phone) {
          // 기존 사용자 정보 먼저 조회 (email 유지를 위해)
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .maybeSingle();

          const updateData: any = { id: userId };
          
          // 기존 email 유지 (없으면 빈 문자열)
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
          } else {
            console.log('Users table updated:', updateData);
          }
        }
      } else {
        console.warn('User not found for payment. recvphone:', recvphone, 'var1:', var1);
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
      // 결제 실패
      console.log('Payment failed:', {
        orderId: var1,
        errorCode: pay_state,
        errorMessage: '결제 상태: ' + pay_state
      });

      // 실패 내역 저장
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

    console.log('PayApp webhook GET received:', body);

    const { RETURNCODE, var1: orderId } = body;

    // POST와 동일한 로직 수행
    if (RETURNCODE === '0000') {
      console.log('Payment success via GET:', body);
    }

    return new NextResponse('SUCCESS', { status: 200 });

  } catch (error) {
    console.error('PayApp webhook GET error:', error);
    return new NextResponse('ERROR', { status: 500 });
  }
}

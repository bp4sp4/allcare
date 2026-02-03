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

    // 페이앱 응답 파라미터
    const {
      RETURNCODE,  // 결과코드 (0000: 성공)
      RETURNMSG,   // 결과메시지
      TRADEID,     // 거래번호
      PRICE,       // 결제금액
      GOODNAME,    // 상품명
      RECVPHONE,   // 받는사람 전화번호
      var1,        // 주문 데이터 (JSON)
      OKTIME,      // 승인시간
      BILLKEY      // 정기결제 키
    } = body;

    // 결제 성공 시
    if (RETURNCODE === '0000') {
      console.log('Payment success:', {
        tradeId: TRADEID,
        amount: PRICE,
        goodName: GOODNAME,
        approvedAt: OKTIME,
        billKey: BILLKEY,
        var1
      });

      // var1에서 user_id 추출
      let userId = null;
      let orderData: any = {};

      try {
        // var1이 JSON 형태인 경우 파싱
        if (var1) {
          try {
            orderData = JSON.parse(var1);
            userId = orderData.userId;
          } catch (e) {
            // JSON이 아닌 경우 orderId로만 사용
            orderData = { orderId: var1 };
          }
        }
      } catch (err) {
        console.error('var1 parse error:', err);
      }

      // userId가 없으면 전화번호로 찾기
      if (!userId && RECVPHONE) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('phone', RECVPHONE)
          .maybeSingle();

        if (userData) {
          userId = userData.id;
        }
      }

      // userId가 있으면 구독 정보 저장
      if (userId) {
        // 구독 정보 생성 또는 업데이트
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        const { error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: 'premium',
            status: 'active',
            amount: parseInt(PRICE),
            billing_cycle: 'monthly',
            start_date: new Date().toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            payapp_bill_key: BILLKEY,
            payapp_trade_id: TRADEID
          }, {
            onConflict: 'user_id'
          });

        if (subscriptionError) {
          console.error('Subscription creation error:', subscriptionError);
        } else {
          console.log('Subscription created/updated for user:', userId);
        }

        // users 테이블에 이름/전화번호 업데이트 (결제 폼에서 입력한 데이터)
        if (orderData.name || orderData.phone) {
          const updateData: any = { id: userId };
          
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
        console.warn('User not found for payment. RECVPHONE:', RECVPHONE, 'var1:', var1);
      }

      // 결제 내역 저장
      await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          order_id: orderData.orderId || `ORDER-${Date.now()}`,
          trade_id: TRADEID,
          amount: parseInt(PRICE),
          good_name: GOODNAME,
          customer_phone: RECVPHONE,
          status: 'completed',
          payment_method: 'payapp',
          approved_at: OKTIME ? new Date(OKTIME).toISOString() : new Date().toISOString()
        });

    } else {
      // 결제 실패
      console.log('Payment failed:', {
        orderId: var1,
        errorCode: RETURNCODE,
        errorMessage: RETURNMSG
      });

      // 실패 내역 저장
      await supabaseAdmin
        .from('payments')
        .insert({
          order_id: var1 || `ORDER-${Date.now()}`,
          amount: parseInt(PRICE) || 0,
          good_name: GOODNAME || 'Unknown',
          customer_phone: RECVPHONE,
          status: 'failed',
          payment_method: 'payapp',
          error_code: RETURNCODE,
          error_message: RETURNMSG
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

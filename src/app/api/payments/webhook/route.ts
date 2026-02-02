import { NextRequest, NextResponse } from 'next/server';

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
      var1,        // 주문번호 (커스텀 변수)
      OKTIME       // 승인시간
    } = body;

    // TODO: 데이터베이스에 결제 결과 업데이트
    if (RETURNCODE === '0000') {
      // 결제 성공
      console.log('Payment success:', {
        tradeId: TRADEID,
        orderId: var1,
        amount: PRICE,
        goodName: GOODNAME,
        approvedAt: OKTIME
      });

      // await db.payments.update({
      //   where: { orderId: var1 },
      //   data: {
      //     status: 'completed',
      //     tradeId: TRADEID,
      //     approvedAt: new Date(OKTIME)
      //   }
      // });
    } else {
      // 결제 실패
      console.log('Payment failed:', {
        orderId: var1,
        errorCode: RETURNCODE,
        errorMessage: RETURNMSG
      });

      // await db.payments.update({
      //   where: { orderId: var1 },
      //   data: {
      //     status: 'failed',
      //     errorCode: RETURNCODE,
      //     errorMessage: RETURNMSG
      //   }
      // });
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

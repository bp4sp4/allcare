import { NextRequest, NextResponse } from 'next/server';

// 결제 요청 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, orderId, orderName, productName, productType, billingCycle, customerName, customerPhone } = body;

    // 결제 요청 검증
    if (!amount || (!orderName && !productName)) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 주문번호 생성 (없는 경우)
    const finalOrderId = orderId || `ORDER-${Date.now()}`;
    const finalOrderName = orderName || productName;

    // TODO: 데이터베이스에 주문 정보 저장
    // await db.orders.create({
    //   orderId: finalOrderId,
    //   amount,
    //   orderName: finalOrderName,
    //   productType,
    //   billingCycle,
    //   customerName,
    //   customerPhone,
    //   status: 'pending'
    // });

    ('Payment request created:', {
      orderId: finalOrderId,
      amount,
      orderName: finalOrderName,
      productType,
      billingCycle,
      customerName,
      customerPhone
    });

    // PayApp 결제 URL 생성
    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || 'korhrdcorp';
    const payappShopName = process.env.NEXT_PUBLIC_PAYAPP_SHOP_NAME || '한평생올케어';
    const payappLinkKey = process.env.PAYAPP_LINK_KEY;
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // URL 끝의 슬래시 제거
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // PayApp 결제 요청 파라미터
    const payappParams = new URLSearchParams({
      userid: payappUserId,
      linkkey: payappLinkKey || '',
      shopname: payappShopName,
      goodname: finalOrderName,
      price: amount.toString(),
      recvphone: customerPhone || '',
      recvname: customerName || '',
      var1: finalOrderId, // 주문번호
      returnurl: `${baseUrl}/api/payments/result`,
      feedbackurl: `${baseUrl}/api/payments/webhook`
    });

    const paymentUrl = `https://api.payapp.kr/order/order_pay.php?${payappParams.toString()}`;

    return NextResponse.json({
      success: true,
      message: '결제 요청이 생성되었습니다.',
      data: {
        orderId: finalOrderId,
        amount,
        orderName: finalOrderName,
        status: 'pending'
      },
      paymentUrl: paymentUrl
    });

  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 결제 내역 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId가 필요합니다.' },
        { status: 400 }
      );
    }

    // TODO: 데이터베이스에서 결제 내역 조회

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        status: 'pending',
        message: '결제 내역 조회 기능 구현 예정'
      }
    });

  } catch (error) {
    console.error('Payment query error:', error);
    return NextResponse.json(
      { error: '결제 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

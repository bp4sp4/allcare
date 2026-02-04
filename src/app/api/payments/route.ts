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

    console.log('Payment request created:', {
      orderId: finalOrderId,
      amount,
      orderName: finalOrderName,
      productType,
      billingCycle,
      customerName,
      customerPhone
    });

    // PayApp 결제 URL 생성
    const payappBaseUrl = process.env.NEXT_PUBLIC_PAYAPP_BASE_URL || 'https://api.payapp.kr';
    const merchantId = process.env.PAYAPP_MERCHANT_ID || 'YOUR_MERCHANT_ID';
    
    // PayApp 결제 요청 파라미터
    const payappParams = new URLSearchParams({
      merchant_id: merchantId,
      order_id: finalOrderId,
      amount: amount.toString(),
      product_name: finalOrderName,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payments/result`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/cancel`
    });

    const paymentUrl = `${payappBaseUrl}/payment/checkout?${payappParams.toString()}`;

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

import { NextRequest, NextResponse } from 'next/server';

// 결제 요청 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, orderId, orderName, customerName, customerPhone } = body;

    // 결제 요청 검증
    if (!amount || !orderName) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 주문번호 생성 (없는 경우)
    const finalOrderId = orderId || `ORDER-${Date.now()}`;

    // TODO: 데이터베이스에 주문 정보 저장
    // await db.orders.create({
    //   orderId: finalOrderId,
    //   amount,
    //   orderName,
    //   customerName,
    //   customerPhone,
    //   status: 'pending'
    // });

    console.log('Payment request created:', {
      orderId: finalOrderId,
      amount,
      orderName,
      customerName,
      customerPhone
    });

    return NextResponse.json({
      success: true,
      message: '결제 요청이 생성되었습니다.',
      data: {
        orderId: finalOrderId,
        amount,
        orderName,
        status: 'pending',
        paymentUrl: '/payment' // 페이앱 결제 페이지로 이동
      }
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

import { NextRequest, NextResponse } from 'next/server';

// 결제 결과 저장 (클라이언트에서 호출)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Payment result received:', body);

    // TODO: 데이터베이스에 결제 결과 저장
    // 예: await db.payments.create({ data: { ... } })

    const { RETURNCODE, TRADEID, var1: orderId, PRICE, GOODNAME } = body;

    if (RETURNCODE === '0000') {
      // 결제 성공
      return NextResponse.json({
        success: true,
        message: '결제가 완료되었습니다.',
        data: {
          tradeId: TRADEID,
          orderId,
          amount: PRICE,
          goodName: GOODNAME
        }
      });
    } else {
      // 결제 실패
      return NextResponse.json({
        success: false,
        message: '결제에 실패했습니다.',
        error: body.RETURNMSG
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment result error:', error);
    return NextResponse.json(
      { error: '결제 결과 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

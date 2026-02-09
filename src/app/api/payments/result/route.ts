import { NextRequest, NextResponse } from 'next/server';

// PayApp 결제 결과 콜백 (GET)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // PayApp에서 전달하는 파라미터
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status'); // success, fail, cancel
    const amount = searchParams.get('amount');
    const transactionId = searchParams.get('transaction_id');
    const message = searchParams.get('message');



    // TODO: 결제 결과 검증 및 DB 업데이트
    // await db.orders.update({
    //   where: { orderId },
    //   data: {
    //     status,
    //     transactionId,
    //     paidAt: status === 'success' ? new Date() : null
    //   }
    // });

    // 결과를 부모 창으로 전달하는 HTML 페이지 반환
    const resultHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>결제 결과</title>
        <style>
          body {
            font-family: 'Pretendard', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .result-container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .success { color: #0051FF; }
          .fail { color: #FF4444; }
          h1 { margin-bottom: 20px; }
          p { color: #666; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="result-container">
          <h1 class="${status === 'success' ? 'success' : 'fail'}">
            ${status === 'success' ? '✓ 결제 완료' : '✗ 결제 실패'}
          </h1>
          <p>${message || (status === 'success' ? '결제가 정상적으로 완료되었습니다.' : '결제에 실패했습니다.')}</p>
          <p>주문번호: ${orderId}</p>
          ${status === 'success' ? `<p>결제금액: ${Number(amount).toLocaleString()}원</p>` : ''}
          <p style="color: #999; font-size: 14px; margin-top: 20px;">잠시 후 자동으로 창이 닫힙니다.</p>
        </div>
        <script>
          // 부모 창으로 결제 결과 전달 및 페이지 이동
          if (window.opener) {
            var paymentStatus = '${status}';
            if (paymentStatus === 'success') {
              // 성공 시: 부모 창을 결제완료 페이지로 이동시키고 팝업 닫기
              try {
                window.opener.location.href = '/payment/success';
                window.close();
              } catch (e) {
                // 팝업 닫기 실패 시 postMessage 폴백
                window.opener.postMessage({
                  type: 'paymentResult',
                  data: {
                    orderId: '${orderId}',
                    status: '${status}',
                    amount: ${amount},
                    transactionId: '${transactionId}',
                    message: '${message || ''}'
                  }
                }, '*');
                setTimeout(function() { window.close(); }, 3000);
              }
            } else {
              // 실패 시: postMessage로 부모에게 알리고 팝업 닫기
              window.opener.postMessage({
                type: 'paymentResult',
                data: {
                  orderId: '${orderId}',
                  status: '${status}',
                  amount: ${amount},
                  transactionId: '${transactionId}',
                  message: '${message || ''}'
                }
              }, '*');
              setTimeout(function() { window.close(); }, 3000);
            }
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(resultHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Payment result callback error:', error);
    return new NextResponse(
      `<html><body><h1>오류가 발생했습니다</h1><p>결제 결과 처리 중 오류가 발생했습니다.</p></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

// 결제 결과 저장 (클라이언트에서 호출)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();


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

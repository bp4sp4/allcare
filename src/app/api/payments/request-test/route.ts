import { NextRequest, NextResponse } from 'next/server';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

export async function POST(request: NextRequest) {
  try {
    const { recvphone, buyerName, userId } = await request.json();

    if (!recvphone) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
    if (!payappUserId) {
      return NextResponse.json({ error: '결제 시스템 설정 오류입니다.' }, { status: 500 });
    }

    const goodname = '고등학교 졸업자 패키지 (테스트)';
    const price = '30000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://allcare.korhrd.co.kr';
    const orderId = `TEST-${Date.now()}`;

    const params = new URLSearchParams({
      cmd: 'payrequest',
      userid: payappUserId,
      goodname,
      price,
      recvphone,
      smsuse: 'n',
      feedbackurl: `${baseUrl}/api/payments/webhook`,
      returnurl: `${baseUrl}/payment/success`,
      var1: JSON.stringify({ orderId, userId: userId || '', packageType: 'high' }),
      openpaytype: 'card,phone,kakaopay,naverpay,smilepay,rbank,applepay,payco,wechat,myaccount,tosspay',
      checkretry: 'y',
      amount_taxable: '0',
      amount_taxfree: price,
      amount_vat: '0',
    });

    if (buyerName) params.set('memo', buyerName);

    const res = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await res.text();
    const result: Record<string, string> = {};
    new URLSearchParams(text).forEach((v, k) => { result[k] = v; });

    if (result.state !== '1') {
      return NextResponse.json({ error: result.errorMessage || '결제 요청에 실패했습니다.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, payurl: result.payurl });

  } catch (error) {
    console.error('Test payment request error:', error);
    return NextResponse.json({ error: '결제 요청 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

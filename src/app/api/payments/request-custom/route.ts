import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

    let decoded: any;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const { requestId, returnUrl } = await request.json();
    if (!requestId) return NextResponse.json({ error: '결제 요청 ID가 필요합니다.' }, { status: 400 });

    // 해당 결제 요청 조회
    const { data: req, error } = await supabaseAdmin
      .from('custom_payment_requests')
      .select('*, users(name, phone)')
      .eq('id', requestId)
      .eq('user_id', decoded.userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !req) {
      return NextResponse.json({ error: '결제 요청을 찾을 수 없습니다.' }, { status: 404 });
    }

    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.hanallcare.com';
    const recvphone = req.users?.phone || '';
    const buyerName = req.users?.name || '';

    if (!recvphone) {
      return NextResponse.json({ error: '결제에 필요한 전화번호가 없습니다. 마이페이지에서 전화번호를 등록해주세요.' }, { status: 400 });
    }

    const goodname = `단과반 - ${req.subject}`;
    const price = req.amount.toString();
    const orderId = `CUSTOM-${Date.now()}`;

    const params = new URLSearchParams({
      cmd: 'payrequest',
      userid: payappUserId,
      goodname,
      price,
      recvphone,
      smsuse: 'n',
      feedbackurl: `${baseUrl}/api/payments/webhook`,
      returnurl: returnUrl || `${baseUrl}/payment/success`,
      var1: JSON.stringify({ orderId, userId: decoded.userId, requestId, type: 'custom' }),
      checkretry: 'y',
      openpaytype: 'card,phone,kakaopay,naverpay,smilepay,rbank,applepay,payco,wechat,myaccount,tosspay',
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
    console.error('Custom payment request error:', error);
    return NextResponse.json({ error: '결제 요청 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

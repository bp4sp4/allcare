import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

async function callPayAppBill(params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const res = await fetch(PAYAPP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  // 응답은 쿼리스트링 형식
  const result: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => { result[k] = v; });
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      packageType,  // 'high' | 'college'
      cardNo,
      expMonth,
      expYear,
      cardPw,
      buyerAuthNo,
      buyerPhone,
      buyerName,
      userId,
    } = body;

    if (!packageType || !cardNo || !expMonth || !expYear || !cardPw || !buyerAuthNo || !buyerPhone || !buyerName) {
      return NextResponse.json({ error: '필수 정보를 모두 입력해주세요.' }, { status: 400 });
    }

    const payappUserId = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
    const linkKey = process.env.PAYAPP_LINK_KEY || '';

    if (!payappUserId || !linkKey) {
      return NextResponse.json({ error: '결제 시스템 설정 오류입니다.' }, { status: 500 });
    }

    const goodName = packageType === 'high' ? '고등학교 졸업자 패키지' : '대학교 졸업자 패키지';
    const price = packageType === 'high' ? '1170000' : '720000';

    // 1. 카드 등록 (billRegist)
    const registResult = await callPayAppBill({
      cmd: 'billRegist',
      userid: payappUserId,
      linkkey: linkKey,
      cardNo,
      expMonth,
      expYear,
      cardPw,
      buyerAuthNo,
      buyerPhone,
      buyerName,
    });

    if (registResult.RETURNCODE !== '0000') {
      console.error('billRegist failed:', registResult);
      return NextResponse.json({
        error: registResult.RETURNMESSAGE || '카드 등록에 실패했습니다.',
        code: registResult.RETURNCODE,
      }, { status: 400 });
    }

    const encBill = registResult.encBill;
    if (!encBill) {
      return NextResponse.json({ error: '카드 등록 응답 오류입니다.' }, { status: 500 });
    }

    const orderId = `PKG-${Date.now()}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://allcare.korhrd.co.kr';

    // 2. 결제 실행 (billPay) — 요양보호사 교육은 면세
    const payResult = await callPayAppBill({
      cmd: 'billPay',
      userid: payappUserId,
      linkkey: linkKey,
      encBill,
      goodName,
      price,
      amount_taxable: '0',
      amount_taxfree: price,
      amount_vat: '0',
      var1: JSON.stringify({ orderId, userId: userId || '', packageType, type: 'package', name: buyerName, phone: buyerPhone }),
      feedbackurl: `${baseUrl}/api/payments/webhook`,
    });

    // 3. 카드 등록 삭제 (billDelete) — 결과와 무관하게 항상 삭제
    try {
      await callPayAppBill({
        cmd: 'billDelete',
        userid: payappUserId,
        linkkey: linkKey,
        encBill,
      });
    } catch (e) {
      console.error('billDelete failed (non-critical):', e);
    }

    if (payResult.RETURNCODE !== '0000') {
      console.error('billPay failed:', payResult);
      return NextResponse.json({
        error: payResult.RETURNMESSAGE || '결제에 실패했습니다.',
        code: payResult.RETURNCODE,
      }, { status: 400 });
    }

    const mulNo = payResult.mul_no;

    // 4. payments 테이블에 저장
    await supabaseAdmin.from('payments').insert({
      user_id: userId || null,
      order_id: orderId,
      trade_id: mulNo,
      amount: parseInt(price),
      good_name: goodName,
      customer_phone: buyerPhone,
      status: 'completed',
      payment_method: 'payapp_bill',
      approved_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, orderId, mulNo });

  } catch (error) {
    console.error('Bill payment error:', error);
    return NextResponse.json({ error: '결제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

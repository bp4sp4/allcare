import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 학점은행제 어드민 DB 동기화
const hakjeomAdmin = process.env.HAKJEOM_SUPABASE_URL && process.env.HAKJEOM_SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.HAKJEOM_SUPABASE_URL, process.env.HAKJEOM_SUPABASE_SERVICE_ROLE_KEY)
  : null;

function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded.userId || null;
  } catch {
    return null;
  }
}

// 단과반 결제 완료 처리
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const userId = getUserIdFromToken(authHeader);

  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { requestId, orderId } = await request.json();
  if (!requestId) {
    return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('custom_payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      order_id: orderId || null,
    })
    .eq('id', requestId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    return NextResponse.json({ error: '결제 완료 처리에 실패했습니다.' }, { status: 500 });
  }

  // 학점은행제 어드민 동기화
  const paidAt = new Date().toISOString();
  hakjeomAdmin?.from('allcare_custom_payment_requests')
    .update({ status: 'paid', paid_at: paidAt, order_id: orderId || null })
    .eq('id', requestId)
    .then(({ error: syncErr }) => {
      if (syncErr) console.error('[hakjeom sync] custom_payment_requests complete error:', syncErr);
    });

  return NextResponse.json({ success: true });
}

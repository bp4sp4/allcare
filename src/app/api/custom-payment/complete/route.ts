import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

  return NextResponse.json({ success: true });
}

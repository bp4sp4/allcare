import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded.isAdmin === true;
  } catch {
    return false;
  }
}

// 단과반 결제 요청 생성
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
  }

  const { userId, subject, subjectCount, amount, memo } = await request.json();

  if (!userId || !subject || !amount) {
    return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('custom_payment_requests')
    .insert({
      user_id: userId,
      subject,
      subject_count: subjectCount || 1,
      amount,
      memo: memo || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Custom payment insert error:', error);
    return NextResponse.json({ error: '결제 요청 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// 단과반 결제 요청 목록 조회 (관리자용)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let query = supabaseAdmin
    .from('custom_payment_requests')
    .select(`*, users(email, name, phone)`)
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: '조회에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

// 단과반 결제 요청 취소
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('custom_payment_requests')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: '취소에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

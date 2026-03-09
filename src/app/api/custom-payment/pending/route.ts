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

// 로그인 유저의 미결제 단과반 요청 확인
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const userId = getUserIdFromToken(authHeader);

  if (!userId) {
    return NextResponse.json({ hasPending: false });
  }

  const { data, error } = await supabaseAdmin
    .from('custom_payment_requests')
    .select('id, subject, subject_count, amount, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ hasPending: false });
  }

  return NextResponse.json({
    hasPending: (data?.length ?? 0) > 0,
    requests: data || [],
  });
}

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

function verifyAdmin(authHeader: string | null): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded.isAdmin === true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from('payments')
    .select('*, users(name, email, phone)', { count: 'exact' })
    .order('approved_at', { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data || [], total: count || 0, page, pageSize });
}

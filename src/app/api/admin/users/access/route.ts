import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

function verifyAdminToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = verifyAdminToken(req.headers.get('authorization'));
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 });
  }

  const { userId, access } = await req.json();

  if (!userId || typeof access !== 'boolean') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ practice_matching_access: access })
    .eq('id', userId);

  if (error) {
    console.error('Access update error:', error);
    return NextResponse.json({ error: '변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

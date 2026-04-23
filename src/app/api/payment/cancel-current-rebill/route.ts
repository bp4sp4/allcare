import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelRebill } from '@/lib/payapp';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PAYAPP_USER_ID = process.env.NEXT_PUBLIC_PAYAPP_USER_ID || '';
const PAYAPP_LINK_KEY = process.env.PAYAPP_LINK_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: '토큰 오류' }, { status: 401 });
    }

    const userId = decoded.userId;

    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancel_scheduled'])
      .not('payapp_bill_key', 'is', null);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, cancelled: 0 });
    }

    let cancelledCount = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      if (!sub.payapp_bill_key) continue;
      const result = await cancelRebill({
        userId: PAYAPP_USER_ID,
        linkKey: PAYAPP_LINK_KEY,
        rebillNo: sub.payapp_bill_key,
      });

      if (result.success) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ payapp_bill_key: null, updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        cancelledCount++;
      } else {
        errors.push(`${sub.payapp_bill_key}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, cancelled: cancelledCount, errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, cancelled: cancelledCount });
  } catch (error) {
    console.error('Cancel current rebill error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

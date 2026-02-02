import { NextResponse } from 'next/server';

// 헬스체크 API
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'allcare-api'
  });
}

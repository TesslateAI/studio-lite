import { NextRequest, NextResponse } from 'next/server';

const globalAny = globalThis as any;
const guestRateLimitMap = globalAny.guestRateLimitMap || (globalAny.guestRateLimitMap = new Map());
const GUEST_LIMIT = 20;
const GUEST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown-ip'
  );
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get('session');
  if (!session) {
    const ip = getClientIp(req);
    const key = ip;
    const entry = guestRateLimitMap.get(key);
    const now = Date.now();
    let count = 0;
    let remainingMs = GUEST_WINDOW_MS;
    if (entry && now - entry.start <= GUEST_WINDOW_MS) {
      count = entry.count;
      remainingMs = GUEST_WINDOW_MS - (now - entry.start);
    }
    return new NextResponse(
      JSON.stringify({ count, limit: GUEST_LIMIT, windowMs: GUEST_WINDOW_MS, remainingMs }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new NextResponse(
    JSON.stringify({ count: null, limit: null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
} 
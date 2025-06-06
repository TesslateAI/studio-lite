import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = req.cookies.get('session');
  
  // If user is not logged in (is a guest), return null count.
  // The frontend can interpret this as "no limit" or hide the counter.
  if (!session) {
    return new NextResponse(
      JSON.stringify({ count: null, limit: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Logged-in users also have no guest limit.
  return new NextResponse(
    JSON.stringify({ count: null, limit: null }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
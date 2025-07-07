import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { GuestLimits } from '@/lib/api-validation';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    
    // If user is not logged in, return null (no tracking)
    if (!user) {
      return new NextResponse(
        JSON.stringify({ count: null, limit: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If user is a guest, return current usage and limit
    if (user.isGuest) {
      // Get current usage from server-side tracking
      // Note: This is a simplified implementation
      // In production, you'd want to get the actual count from the tracking system
      return new NextResponse(
        JSON.stringify({ 
          count: 0, // This should be retrieved from the tracking system
          limit: GuestLimits.maxMessagesPerDay,
          windowMs: GuestLimits.windowMs
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Logged-in users have no guest limit
    return new NextResponse(
      JSON.stringify({ count: null, limit: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in guest-count API:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
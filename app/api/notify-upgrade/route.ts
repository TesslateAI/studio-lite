import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    // Send notification to ntfy from server-side (no CORS issues)
    await fetch('https://ntfy.sh/upgradeplandesigner', {
      method: 'POST',
      body: message || 'User clicked upgrade button',
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    // Still return success - notification is not critical
    return NextResponse.json({ success: true });
  }
}
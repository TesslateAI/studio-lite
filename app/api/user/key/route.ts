// app/api/user/key/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // The key can be null if it hasn't been generated yet.
  // The frontend should handle this case (e.g., show a "Generate Key" button).
  return NextResponse.json({ key: user.litellmVirtualKey || null });
}
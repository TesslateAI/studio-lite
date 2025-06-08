// app/api/user/key/regenerate/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { regenerateUserKey } from '@/lib/litellm/management';

export async function POST() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newKey = await regenerateUserKey(user.id);
    return NextResponse.json({ key: newKey });
  } catch (error) {
    console.error(`Failed to regenerate key for user ${user.id}:`, error);
    return NextResponse.json({ error: 'Failed to regenerate key. Please try again later.' }, { status: 500 });
  }
}
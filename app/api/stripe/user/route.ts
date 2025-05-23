import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { stripe as stripeTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }
  const stripeRecord = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, user.id))
    .limit(1);

  if (!stripeRecord.length) {
    return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 });
  }

  return new Response(JSON.stringify(stripeRecord[0]), { status: 200 });
} 
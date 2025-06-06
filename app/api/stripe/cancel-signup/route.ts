// app/api/stripe/cancel-signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (session && session.user && session.user.id) {
        // Find the stripe record
        const stripeRecord = await db
            .select()
            .from(stripeTable)
            .where(eq(stripeTable.userId, session.user.id))
            .limit(1);

        if (stripeRecord.length > 0) {
            // Delete all activity logs referencing this stripe record
            await db.delete(activityLogs).where(eq(activityLogs.stripeId, stripeRecord[0].id));
            // Now delete the stripe record
            await db.delete(stripeTable).where(eq(stripeTable.userId, session.user.id));
        }

        // Delete the user
        await db.delete(users).where(eq(users.id, session.user.id));
        // Clear session cookie
        (await cookies()).delete('session');
    }
    return NextResponse.json({ ok: true });
}

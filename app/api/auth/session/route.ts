// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthSDK } from '@/lib/firebase/server';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable, ActivityType, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PlanName } from '@/lib/litellm/plans';
import { createUserKey } from '@/lib/litellm/management';

const SESSION_COOKIE_NAME = 'session';

// Endpoint to create a session cookie from a Firebase ID token
export async function POST(request: NextRequest) {
    const { idToken, plan, isGuest } = await request.json();

    if (!idToken) {
        return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    try {
        const adminAuth = getAdminAuthSDK();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        // Ensure user exists in our DB
        let user = await db.query.users.findFirst({ where: eq(users.id, uid) });

        if (!user) {
            console.log(`User with UID ${uid} not found in DB, creating new record.`);
            const [newUser] = await db.insert(users).values({
                id: uid,
                email: email,
                name: email?.split('@')[0] || 'New User',
                isGuest: !!isGuest,
            }).returning();
            user = newUser;

            // Create LiteLLM key for the new user
            try {
                const planToCreate = (plan as PlanName) || 'free';
                await createUserKey(user, planToCreate);
            } catch (e) {
                console.error(`CRITICAL: User ${user.id} created but LiteLLM key generation failed.`, e);
            }
        }

        // Create Stripe record if it doesn't exist
        let stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, user.id) });
        if (!stripeRecord) {
             [stripeRecord] = await db.insert(stripeTable).values({
                userId: user.id,
                name: `${user.email} subscription`,
            }).returning();
        }

        if (!isGuest) {
            await db.insert(activityLogs).values({
                stripeId: stripeRecord.id,
                userId: user.id,
                action: ActivityType.SIGN_IN
            });
        }

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        // FIX: Await the cookies() function call.
        (await cookies()).set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, user });

    } catch (error: any) {
        console.error('Session Login Error:', error.message);
        return NextResponse.json({ error: 'Failed to create session.' }, { status: 401 });
    }
}


// Endpoint to revoke the session cookie
export async function DELETE() {
    try {
        // FIX: Await the cookies() function call.
        (await cookies()).delete(SESSION_COOKIE_NAME);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Session Logout Error:', error);
        return NextResponse.json({ error: 'Failed to log out.' }, { status: 500 });
    }
}
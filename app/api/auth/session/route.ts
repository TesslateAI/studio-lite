// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuthSDK } from '@/lib/firebase/server';
import { db } from '@/lib/db/drizzle';
import { users, stripe as stripeTable, ActivityType, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PlanName } from '@/lib/litellm/plans';
import { createUserKey } from '@/lib/litellm/management';
import { sendLoginNotification } from '@/lib/discord/webhook';

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

        // Unified flow for both guests and regular users
        let user = await db.query.users.findFirst({ where: eq(users.id, uid) });
        let isNewUser = false;

        if (!user) {
            console.log(`Creating new ${isGuest ? 'guest ' : ''}user with UID ${uid}`);
            isNewUser = true;
            const [newUser] = await db.insert(users).values({
                id: uid,
                email: email,
                name: email?.split('@')[0] || (isGuest ? 'Guest User' : 'New User'),
                isGuest: !!isGuest,
            }).returning();
            user = newUser;

            // Only create LiteLLM key for regular users during session creation
            if (!isGuest) {
                try {
                    const planToCreate = (plan as PlanName) || 'free';
                    await createUserKey(user, planToCreate);
                    console.log(`Successfully created LiteLLM key for user ${user.id}`);
                } catch (e) {
                    console.error(`Warning: User ${user.id} created but LiteLLM key generation failed.`, e);
                    // Continue anyway - key can be created later
                }
            } else {
                console.log(`Guest user ${user.id} created, LiteLLM key will be created on demand`);
            }
        }

        // Create Stripe record for non-guest users
        if (!isGuest) {
            let stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, user.id) });
            if (!stripeRecord) {
                [stripeRecord] = await db.insert(stripeTable).values({
                    userId: user.id,
                    name: `${user.email || user.id} subscription`,
                }).returning();
            }

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

        // Send Discord notification for login
        sendLoginNotification(user.email, user.id, isNewUser, !!isGuest).catch(err => {
            console.error('Failed to send Discord notification:', err);
        });

        return NextResponse.json({ success: true, user });

    } catch (error: unknown) {
        // Detailed error logging for debugging
        console.error('=== SESSION CREATION ERROR ===');
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            isGuest,
            hasIdToken: !!idToken,
            requestBody: { isGuest, plan: plan || 'none' }
        });
        console.error('=== END SESSION ERROR ===');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ 
            error: 'Failed to create session', 
            details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
        }, { status: 500 });
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
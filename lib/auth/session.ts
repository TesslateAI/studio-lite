// lib/auth/session.ts
import { cookies } from 'next/headers';
import { getAdminAuthSDK } from '@/lib/firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = 'session';

/**
 * Verifies the session cookie from the request and returns the decoded token.
 * Returns null if the cookie is invalid or expired.
 */
export async function getSession(): Promise<DecodedIdToken | null> {
    // FIX: Await the cookies() function call.
    const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
        return null;
    }

    try {
        const adminAuth = getAdminAuthSDK();
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedToken;
    } catch (error) {
        // Session cookie is invalid or revoked.
        return null;
    }
}
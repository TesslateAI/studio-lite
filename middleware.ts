import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken, SessionData } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

// This is the fix: Force middleware to run in the Node.js runtime.
export const runtime = 'nodejs';

const PROTECTED_ROUTES = ['/settings', '/pricing'];
const AUTH_ROUTES = ['/sign-in', '/sign-up'];
const PUBLIC_LANDING = '/';
const CHAT_PATH = '/chat';

/**
 * Handles logic for requests without a valid session cookie.
 */
async function handleNoSession(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // If a user without a session visits the chat page, create a guest account for them.
    if (pathname.startsWith(CHAT_PATH)) {
        const [guest] = await db.insert(users).values({
            isGuest: true,
            name: 'Guest'
        }).returning();

        // Set a session cookie for the new guest.
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const guestSession: SessionData = {
            user: { id: guest.id, isGuest: true },
            expires: expiresInOneDay.toISOString(),
        };
        const response = NextResponse.next();
        response.cookies.set('session', await signToken(guestSession), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiresInOneDay,
        });
        return response;
    }

    // If they visit a protected route, redirect them to sign in.
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Otherwise, allow the request.
    return NextResponse.next();
}

/**
 * Handles logic for requests that have a valid session.
 */
async function handleSession(request: NextRequest, sessionData: SessionData) {
    const { pathname } = request.nextUrl;
    const { isGuest } = sessionData.user;

    // Redirect logged-in (non-guest) users from auth/landing pages to the chat.
    if (!isGuest && (AUTH_ROUTES.includes(pathname) || pathname === PUBLIC_LANDING)) {
        return NextResponse.redirect(new URL(CHAT_PATH, request.url));
    }

    // Always refresh the session cookie on navigation to keep the user logged in.
    const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    sessionData.expires = expiresInOneDay.toISOString();
    const response = NextResponse.next();
    response.cookies.set('session', await signToken(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresInOneDay,
    });
    return response;
}

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('session');

    // Case 1: No session cookie.
    if (!sessionCookie) {
        return handleNoSession(request);
    }

    // Case 2: Session cookie exists, try to validate it.
    try {
        const sessionData = await verifyToken(sessionCookie.value);
        // Check for expiration
        if (new Date(sessionData.expires) < new Date()) {
          request.cookies.delete('session');
          return handleNoSession(request);
        }
        return await handleSession(request, sessionData);
    } catch (e) {
        // Token is invalid/malformed.
        request.cookies.delete('session');
        return handleNoSession(request);
    }
}

// Define which paths this middleware will run on.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
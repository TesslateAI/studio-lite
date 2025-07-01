import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminAuthSDK } from '@/lib/firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// FIX: Remove '/chat' from the protected routes. This allows the chat page
// to be accessible publicly, where it will then handle creating an
// anonymous guest session for new visitors.
const PROTECTED_ROUTES = ['/settings', '/upgrade'];
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password'];
const PUBLIC_LANDING = '/';
const SESSION_COOKIE_NAME = 'session';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // 1. Get the session cookie directly from the request. This is the correct way for middleware.
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session: DecodedIdToken | null = null;

    if (sessionCookie) {
        try {
            const adminAuth = getAdminAuthSDK();
            session = await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch (error) {
            // Invalid or expired cookie. Clear it and treat as no session.
            const response = NextResponse.redirect(new URL('/sign-in', request.url));
            response.cookies.delete(SESSION_COOKIE_NAME);
            return response;
        }
    }

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    // 2. Handle redirection logic based on session state.
    if (!session && isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    if (session && isAuthRoute) {
        // Check if the user is a guest - guests should be allowed to access auth routes
        try {
            const userResult = await db
                .select({ isGuest: users.isGuest })
                .from(users)
                .where(and(eq(users.id, session.uid), isNull(users.deletedAt)))
                .limit(1);
            
            // If user is not a guest, redirect to chat
            if (userResult.length > 0 && !userResult[0].isGuest) {
                return NextResponse.redirect(new URL('/chat', request.url));
            }
            // If user is a guest or not found, allow access to auth routes
        } catch (error) {
            console.error('Error checking user guest status in middleware:', error);
            // On error, allow the request to proceed
        }
    }

    // 3. Allow the request to proceed.
    return NextResponse.next();
}

// Define which paths this middleware will run on.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
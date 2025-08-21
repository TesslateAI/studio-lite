import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'session';

// Helper endpoint to clear authentication state
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        
        // Clear the session cookie
        cookieStore.delete(SESSION_COOKIE_NAME);
        
        // Also clear any other auth-related cookies if they exist
        const allCookies = cookieStore.getAll();
        for (const cookie of allCookies) {
            if (cookie.name.includes('auth') || cookie.name.includes('firebase')) {
                cookieStore.delete(cookie.name);
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            message: 'Authentication state cleared' 
        });
    } catch (error) {
        console.error('Error clearing auth state:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to clear authentication state' 
        }, { status: 500 });
    }
}
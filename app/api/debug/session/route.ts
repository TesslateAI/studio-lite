import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Debug session endpoint called with:', body);
        
        // Test Firebase Admin SDK
        try {
            const { getAdminAuthSDK } = await import('@/lib/firebase/server');
            const adminAuth = getAdminAuthSDK();
            console.log('Firebase Admin SDK loaded successfully');
            
            if (body.idToken) {
                const decodedToken = await adminAuth.verifyIdToken(body.idToken);
                console.log('Token verified successfully:', { uid: decodedToken.uid, email: decodedToken.email });
            }
        } catch (firebaseError) {
            console.error('Firebase error:', firebaseError);
            return NextResponse.json({ error: 'Firebase error', details: firebaseError instanceof Error ? firebaseError.message : 'Unknown' }, { status: 500 });
        }
        
        // Test database connection
        try {
            const { db } = await import('@/lib/db/drizzle');
            const { users } = await import('@/lib/db/schema');
            const result = await db.select().from(users).limit(1);
            console.log('Database connection successful, users table accessible');
        } catch (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json({ error: 'Database error', details: dbError instanceof Error ? dbError.message : 'Unknown' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, message: 'All tests passed' });
        
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({ 
            error: 'Debug failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        console.log('=== DEBUG GUEST FLOW ===');
        
        // Check user session
        const user = await getUser();
        console.log('User from session:', {
            hasUser: !!user,
            userId: user?.id,
            isGuest: user?.isGuest,
            hasLiteLLMKey: !!user?.litellmVirtualKey,
            email: user?.email
        });
        
        if (!user) {
            return NextResponse.json({ 
                error: 'No user session found',
                suggestion: 'Visit /chat to create a guest session first'
            });
        }
        
        if (!user.litellmVirtualKey) {
            console.log('User missing LiteLLM key, attempting to create...');
            try {
                const { createUserKey } = await import('@/lib/litellm/management');
                const newKey = await createUserKey(user, 'free');
                console.log(`Successfully created LiteLLM key: ${newKey.substring(0, 8)}...`);
                
                return NextResponse.json({
                    success: true,
                    message: 'Guest user ready for chat',
                    user: {
                        id: user.id,
                        isGuest: user.isGuest,
                        hasLiteLLMKey: true
                    }
                });
            } catch (error) {
                console.error('Failed to create LiteLLM key:', error);
                return NextResponse.json({
                    error: 'Failed to create LiteLLM key',
                    details: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 500 });
            }
        }
        
        return NextResponse.json({
            success: true,
            message: 'Guest user already ready for chat',
            user: {
                id: user.id,
                isGuest: user.isGuest,
                hasLiteLLMKey: true
            }
        });
        
    } catch (error) {
        console.error('Debug guest flow error:', error);
        return NextResponse.json({
            error: 'Debug failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
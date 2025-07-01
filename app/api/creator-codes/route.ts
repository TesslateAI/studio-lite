import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { createCreatorProfile, getCreatorByCode, generateUserShareCode } from '@/lib/payments/creator-codes';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles, userShareCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, AuthenticatedRequest } from '@/lib/auth/middleware';
import { validateCreatorCode } from '@/lib/validation/stripe';

// GET /api/creator-codes - Get creator profile or validate code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const action = searchParams.get('action');
    
    // Validate creator code
    if (code) {
      try {
        const validatedCode = validateCreatorCode(code);
        const creator = await getCreatorByCode(validatedCode);
        if (!creator) {
          return NextResponse.json({ valid: false }, { status: 404 });
        }
        
        return NextResponse.json({
          valid: true,
          code: creator.code,
          displayName: creator.displayName,
          freeMonthsPlus: creator.freeMonthsPlus,
        });
      } catch (error) {
        return NextResponse.json({ valid: false, error: 'Invalid code format' }, { status: 400 });
      }
    }
    
    // Get current user's creator profile
    if (action === 'profile') {
      const user = await getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const [profile] = await db.select()
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, user.id))
        .limit(1);
      
      return NextResponse.json({ profile });
    }
    
    // Get user's share code
    if (action === 'share-code') {
      const user = await getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const shareCode = await generateUserShareCode(user.id);
      return NextResponse.json({ shareCode });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error in creator-codes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/creator-codes - Create creator profile
async function handleCreateCreator(request: AuthenticatedRequest) {
  try {
    
    const body = await request.json();
    const { userId, displayName, plusCommission, proCommission, freeMonthsPlus } = body;
    
    // Input validation
    if (!userId || !displayName || typeof plusCommission !== 'number' || typeof proCommission !== 'number') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }
    
    // Check if creator profile already exists
    const existing = await db.select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, userId))
      .limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Creator profile already exists' }, { status: 409 });
    }
    
    const profile = await createCreatorProfile({
      userId,
      displayName,
      plusCommission,
      proCommission,
      freeMonthsPlus,
    });
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Creator profile creation failed:', {
      timestamp: new Date().toISOString(),
      hasBody: !!request,
      hasError: !!error
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = requireRole('admin')(handleCreateCreator);

// PUT /api/creator-codes - Update creator profile
async function handleUpdateCreator(request: AuthenticatedRequest) {
  try {
    
    const body = await request.json();
    const { 
      creatorProfileId, 
      plusCommissionPercent, 
      proCommissionPercent, 
      freeMonthsPlus,
      isActive 
    } = body;
    
    const updates: any = { updatedAt: new Date() };
    
    if (plusCommissionPercent !== undefined) {
      updates.plusCommissionPercent = plusCommissionPercent.toString();
    }
    if (proCommissionPercent !== undefined) {
      updates.proCommissionPercent = proCommissionPercent.toString();
    }
    if (freeMonthsPlus !== undefined) {
      updates.freeMonthsPlus = freeMonthsPlus;
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }
    
    const [updated] = await db.update(creatorProfiles)
      .set(updates)
      .where(eq(creatorProfiles.id, creatorProfileId))
      .returning();
    
    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Creator profile update failed:', {
      timestamp: new Date().toISOString(),
      hasBody: !!request,
      hasError: !!error
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const PUT = requireRole('admin')(handleUpdateCreator);
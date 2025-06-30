import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { createCreatorProfile, getCreatorByCode, generateUserShareCode } from '@/lib/payments/creator-codes';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles, userShareCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/creator-codes - Get creator profile or validate code
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const action = searchParams.get('action');
    
    // Validate creator code
    if (code) {
      const creator = await getCreatorByCode(code);
      if (!creator) {
        return NextResponse.json({ valid: false }, { status: 404 });
      }
      
      return NextResponse.json({
        valid: true,
        code: creator.code,
        displayName: creator.displayName,
        freeMonthsPlus: creator.freeMonthsPlus,
      });
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
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { userId, displayName, plusCommission, proCommission, freeMonthsPlus } = body;
    
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
    console.error('Error creating creator profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/creator-codes - Update creator profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
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
    console.error('Error updating creator profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
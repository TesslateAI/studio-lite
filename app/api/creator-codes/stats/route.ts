import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles, codeRedemptions, creatorEarnings } from '@/lib/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

// GET /api/creator-codes/stats - Get creator statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get creator profile
    const [profile] = await db.select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, user.id))
      .limit(1);
    
    if (!profile) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 404 });
    }
    
    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';
    
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }
    
    // Get redemption stats
    const redemptionStats = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${codeRedemptions.status} = 'active')`,
      cancelled: sql<number>`count(*) filter (where ${codeRedemptions.status} = 'cancelled')`,
    })
    .from(codeRedemptions)
    .where(and(
      eq(codeRedemptions.creatorProfileId, profile.id),
      gte(codeRedemptions.redeemedAt, startDate)
    ));
    
    // Get earnings stats
    const earningsStats = await db.select({
      totalEarnings: sql<number>`coalesce(sum(${creatorEarnings.amount}), 0)`,
      pendingEarnings: sql<number>`coalesce(sum(${creatorEarnings.amount}) filter (where ${creatorEarnings.status} = 'pending'), 0)`,
      paidEarnings: sql<number>`coalesce(sum(${creatorEarnings.amount}) filter (where ${creatorEarnings.status} = 'paid'), 0)`,
    })
    .from(creatorEarnings)
    .where(and(
      eq(creatorEarnings.creatorProfileId, profile.id),
      gte(creatorEarnings.calculatedAt, startDate)
    ));
    
    // Get recent redemptions
    const recentRedemptions = await db.select({
      id: codeRedemptions.id,
      userId: codeRedemptions.userId,
      planName: codeRedemptions.planName,
      redeemedAt: codeRedemptions.redeemedAt,
      status: codeRedemptions.status,
    })
    .from(codeRedemptions)
    .where(eq(codeRedemptions.creatorProfileId, profile.id))
    .orderBy(desc(codeRedemptions.redeemedAt))
    .limit(10);
    
    // Get earnings breakdown by plan
    const earningsByPlan = await db.select({
      planName: codeRedemptions.planName,
      totalAmount: sql<number>`coalesce(sum(${creatorEarnings.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(creatorEarnings)
    .innerJoin(codeRedemptions, eq(creatorEarnings.redemptionId, codeRedemptions.id))
    .where(and(
      eq(creatorEarnings.creatorProfileId, profile.id),
      gte(creatorEarnings.calculatedAt, startDate)
    ))
    .groupBy(codeRedemptions.planName);
    
    return NextResponse.json({
      profile: {
        code: profile.code,
        displayName: profile.displayName,
        plusCommissionPercent: profile.plusCommissionPercent,
        proCommissionPercent: profile.proCommissionPercent,
        isActive: profile.isActive,
      },
      stats: {
        redemptions: redemptionStats[0] || { total: 0, active: 0, cancelled: 0 },
        earnings: earningsStats[0] || { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0 },
        earningsByPlan,
      },
      recentRedemptions,
    });
  } catch (error) {
    console.error('Error getting creator stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { db } from '@/lib/db/drizzle';
import { creatorProfiles, codeRedemptions, userShareCodes, userReferrals, systemConfig } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { stripe } from './stripe';
import { customAlphabet } from 'nanoid';

// Generate unique codes
const generateCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
const generateShareCode = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

// Get system configuration
export async function getSystemConfig<T>(key: string): Promise<T | null> {
  const result = await db.select()
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .limit(1);
  
  return result[0]?.value as T | null;
}

// Create a new creator profile
export async function createCreatorProfile({
  userId,
  displayName,
  plusCommission = 5,
  proCommission = 15,
  freeMonthsPlus = 1,
}: {
  userId: string;
  displayName?: string;
  plusCommission?: number;
  proCommission?: number;
  freeMonthsPlus?: number;
}) {
  // Generate unique code
  let code: string;
  let attempts = 0;
  
  while (attempts < 10) {
    code = generateCode();
    const existing = await db.select()
      .from(creatorProfiles)
      .where(eq(creatorProfiles.code, code))
      .limit(1);
    
    if (existing.length === 0) break;
    attempts++;
  }
  
  if (attempts === 10) {
    throw new Error('Failed to generate unique creator code');
  }
  
  // Create Stripe coupon for this creator
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: 'repeating',
    duration_in_months: freeMonthsPlus,
    id: `CREATOR_${code!}`,
    metadata: {
      creator_code: code!,
      type: 'creator_promo',
    },
  });
  
  // Create promotion code
  const promotionCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: code!,
    metadata: {
      creator_code: code!,
      type: 'creator_promo',
    },
  });
  
  // Insert creator profile
  const [profile] = await db.insert(creatorProfiles).values({
    userId,
    code: code!,
    displayName,
    stripeCouponId: coupon.id,
    stripePromotionCodeId: promotionCode.id,
    plusCommissionPercent: plusCommission.toString(),
    proCommissionPercent: proCommission.toString(),
    freeMonthsPlus,
  }).returning();
  
  return profile;
}

// Validate and get creator profile by code
export async function getCreatorByCode(code: string) {
  const [creator] = await db.select()
    .from(creatorProfiles)
    .where(and(
      eq(creatorProfiles.code, code),
      eq(creatorProfiles.isActive, true)
    ))
    .limit(1);
  
  return creator;
}

// Track code redemption
export async function trackCodeRedemption({
  creatorCode,
  userId,
  subscriptionId,
  priceId,
  planName,
}: {
  creatorCode: string;
  userId: string;
  subscriptionId: string;
  priceId: string;
  planName: string;
}) {
  const creator = await getCreatorByCode(creatorCode);
  if (!creator) return null;
  
  // Check if user already redeemed a creator code
  const existingRedemption = await db.select()
    .from(codeRedemptions)
    .where(eq(codeRedemptions.userId, userId))
    .limit(1);
  
  if (existingRedemption.length > 0) {
    throw new Error('User has already redeemed a creator code');
  }
  
  // Track redemption
  const [redemption] = await db.insert(codeRedemptions).values({
    creatorProfileId: creator.id,
    userId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    planName,
    freeMonthsGranted: creator.freeMonthsPlus,
  }).returning();
  
  // Update creator stats
  await db.update(creatorProfiles)
    .set({
      totalRedemptions: sql`${creatorProfiles.totalRedemptions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(creatorProfiles.id, creator.id));
  
  return { creator, redemption };
}

// Generate user share code
export async function generateUserShareCode(userId: string) {
  // Check if user already has a share code
  const existing = await db.select()
    .from(userShareCodes)
    .where(eq(userShareCodes.userId, userId))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Generate unique share code
  let code: string;
  let attempts = 0;
  
  while (attempts < 10) {
    code = generateShareCode();
    const existing = await db.select()
      .from(userShareCodes)
      .where(eq(userShareCodes.code, code))
      .limit(1);
    
    if (existing.length === 0) break;
    attempts++;
  }
  
  if (attempts === 10) {
    throw new Error('Failed to generate unique share code');
  }
  
  const [shareCode] = await db.insert(userShareCodes).values({
    userId,
    code: code!,
  }).returning();
  
  return shareCode;
}

// Track user referral
export async function trackUserReferral({
  referralCode,
  referrerId,
  referredId,
}: {
  referralCode: string;
  referrerId: string;
  referredId: string;
}) {
  // Check if referral already exists
  const existing = await db.select()
    .from(userReferrals)
    .where(and(
      eq(userReferrals.referrerId, referrerId),
      eq(userReferrals.referredId, referredId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const [referral] = await db.insert(userReferrals).values({
    referrerId,
    referredId,
    referralCode,
  }).returning();
  
  // Update referrer stats
  await db.update(userShareCodes)
    .set({
      totalReferrals: sql`${userShareCodes.totalReferrals} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userShareCodes.userId, referrerId));
  
  return referral;
}

// Convert referral (when referred user subscribes)
export async function convertReferral(referredUserId: string) {
  const referral = await db.select()
    .from(userReferrals)
    .where(and(
      eq(userReferrals.referredId, referredUserId),
      eq(userReferrals.status, 'pending')
    ))
    .limit(1);
  
  if (referral.length === 0) return null;
  
  // Update referral status
  await db.update(userReferrals)
    .set({
      status: 'converted',
      convertedAt: new Date(),
    })
    .where(eq(userReferrals.id, referral[0].id));
  
  // Update referrer stats
  await db.update(userShareCodes)
    .set({
      successfulReferrals: sql`${userShareCodes.successfulReferrals} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userShareCodes.userId, referral[0].referrerId));
  
  // Check if referrer qualifies for free month
  const shareCode = await db.select()
    .from(userShareCodes)
    .where(eq(userShareCodes.userId, referral[0].referrerId))
    .limit(1);
  
  if (shareCode.length > 0) {
    const config = await getSystemConfig<{ referrals_needed: number; free_months_reward: number }>('referral_rewards');
    const referralsNeeded = config?.referrals_needed || 5;
    const freeMonthsReward = config?.free_months_reward || 1;
    
    if (shareCode[0].successfulReferrals % referralsNeeded === 0) {
      // Grant free month to referrer
      await db.update(userShareCodes)
        .set({
          freeMonthsEarned: sql`${userShareCodes.freeMonthsEarned} + ${freeMonthsReward}`,
        })
        .where(eq(userShareCodes.userId, referral[0].referrerId));
      
      return { referral: referral[0], freeMonthGranted: true };
    }
  }
  
  return { referral: referral[0], freeMonthGranted: false };
}

// Get creator stats
export async function getCreatorStats(creatorId: number) {
  const [stats] = await db.select({
    totalRedemptions: creatorProfiles.totalRedemptions,
    totalEarnings: creatorProfiles.totalEarnings,
    activeSubscriptions: sql<number>`count(distinct ${codeRedemptions.userId}) filter (where ${codeRedemptions.status} = 'active')`,
  })
  .from(creatorProfiles)
  .leftJoin(codeRedemptions, eq(codeRedemptions.creatorProfileId, creatorProfiles.id))
  .where(eq(creatorProfiles.id, creatorId))
  .groupBy(creatorProfiles.id);
  
  return stats;
}
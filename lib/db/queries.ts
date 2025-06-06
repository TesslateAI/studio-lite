import { desc, and, eq, isNull, SQL, ColumnBaseConfig, ColumnDataType, Column } from 'drizzle-orm'; // Changed PgColumn to Column
import { db } from './drizzle';
import { activityLogs, users, stripe as stripeTable, Stripe, ActivityType, User } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

// Define the return type for consistency with what ActivityPage expects
export interface FormattedActivityLog {
  id: number;
  action: string;
  timestamp: Date;
  ipAddress: string | null;
  userName: string | null;
}

export async function getUser(): Promise<User | null> {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const sessionData = await verifyToken(sessionCookie.value);
    if (
      !sessionData ||
      !sessionData.user ||
      typeof sessionData.user.id !== 'number'
    ) {
      return null;
    }

    if (sessionData.expires && new Date(sessionData.expires) < new Date()) {
      return null;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }
    return userResult[0];

  } catch (error) {
    console.error("Error verifying session token:", error);
    return null;
  }
}

export async function getStripeByCustomerId(customerId: string): Promise<Stripe | null> {
  const result = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

interface StripeSubscriptionUpdateData {
  stripeSubscriptionId: string | null;
  stripeProductId: string | null;
  planName: string;
  subscriptionStatus: string;
}

export async function updateStripeSubscription(
  userId: number,
  subscriptionData: StripeSubscriptionUpdateData
): Promise<void> {
  await db
    .update(stripeTable)
    .set({
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
      stripeProductId: subscriptionData.stripeProductId,
      planName: subscriptionData.planName,
      subscriptionStatus: subscriptionData.subscriptionStatus,
      updatedAt: new Date()
    })
    .where(eq(stripeTable.userId, userId));
}

export async function getActivityLogs(): Promise<FormattedActivityLog[]> {
  const user = await getUser();
  if (!user) {
    return [];
  }

  const logsData = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);

  return logsData.map(log => ({
    ...log,
    timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp,
  }));
}
import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, users, stripe as stripeTable, Stripe } from './schema';
import { getSession } from '@/lib/auth/session';
import { User } from './schema';

// Re-export db for use in other modules
export { db };

export interface FormattedActivityLog {
  id: number;
  action: string;
  timestamp: Date;
  ipAddress: string | null;
  userName: string | null;
}

export async function getUser(): Promise<User | null> {
  const decodedToken = await getSession();
  if (!decodedToken) {
    return null;
  }

  try {
    const userResult = await db
      .select()
      .from(users)
      .where(and(eq(users.id, decodedToken.uid), isNull(users.deletedAt)))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }
    return userResult[0];

  } catch (error) {
    console.error("Error fetching user from database:", error);
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
  userId: string,
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
    timestamp: typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp!,
  }));
}
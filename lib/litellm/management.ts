// lib/litellm/management.ts
// Server-only business logic for managing LiteLLM keys.

import { db } from '@/lib/db/drizzle';
import { users, User, stripe } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as litellmApi from './api';
import { plans, PlanName } from './plans';

/**
 * Creates a new LiteLLM virtual key for a user based on their plan
 * and saves it to the database.
 */
export async function createUserKey(user: User, planName: PlanName = 'free'): Promise<string> {
  console.log(`Creating LiteLLM key for user ${user.id} with plan ${planName}`);
  
  const planDetails = plans[planName];
  if (!planDetails) {
    throw new Error(`Invalid plan name: ${planName}`);
  }

  try {
    const response = await litellmApi.generateKey({
      user_id: user.id.toString(),
      models: planDetails.models,
      rpm_limit: planDetails.rpm,
      tpm_limit: planDetails.tpm,
    });
    console.log('Response from LiteLLM API:', response);
    const newKey = response.key;
    if (!newKey) {
      throw new Error('LiteLLM API did not return a key.');
    }

    // Save the new key to the user's record
    await db.update(users)
      .set({ litellmVirtualKey: newKey })
      .where(eq(users.id, user.id));

    console.log(`Successfully created and stored key for user ${user.id}`);
    return newKey;

  } catch (error) {
    console.error(`Failed to create LiteLLM key for user ${user.id}:`, error);
    throw error;
  }
}

/**
 * Updates a user's existing LiteLLM key when their plan changes.
 */
export async function updateUserKeyForPlan(userId: number, newPlanName: PlanName): Promise<void> {
  console.log(`Updating LiteLLM key for user ${userId} to plan ${newPlanName}`);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const planDetails = plans[newPlanName];
  if (!planDetails) {
    throw new Error(`Invalid plan name: ${newPlanName}`);
  }

  if (!user.litellmVirtualKey) {
    console.warn(`User ${userId} had no existing key. Creating a new one.`);
    await createUserKey(user, newPlanName);
    return;
  }
  
  try {
    await litellmApi.updateKey({
      key: user.litellmVirtualKey,
      models: planDetails.models,
      rpm_limit: planDetails.rpm,
      tpm_limit: planDetails.tpm,
    });
    console.log(`Successfully updated key for user ${userId} to plan ${newPlanName}`);
  } catch (error) {
    console.error(`Failed to update LiteLLM key for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Deletes a user's old key and generates a new one based on their current plan.
 */
export async function regenerateUserKey(userId: number): Promise<string> {
    console.log(`Regenerating LiteLLM key for user ${userId}`);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) {
        throw new Error(`User with ID ${userId} not found.`);
    }

    // Find the user's current plan from the stripe table
    // FIX: Switched from `db.query.stripe` (which requires relations to be defined)
    // to the core `db.select()` builder, which always works.
    const stripeRecords = await db.select().from(stripe).where(eq(stripe.userId, userId)).limit(1);
    const stripeRecord = stripeRecords.length > 0 ? stripeRecords[0] : null;

    const currentPlan = (stripeRecord?.planName?.toLowerCase() as PlanName) || 'free';

    // Delete the old key if it exists
    if (user.litellmVirtualKey) {
        try {
            await litellmApi.deleteKey(user.litellmVirtualKey);
            console.log(`Successfully deleted old key for user ${userId}`);
        } catch (error) {
            console.error(`Could not delete old key for user ${userId}, it may have been invalid. Proceeding...`, error);
        }
    }

    // Create a new key with their current plan
    return await createUserKey(user, currentPlan);
}
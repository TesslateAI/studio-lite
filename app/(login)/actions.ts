// app/(login)/actions.ts

'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  stripe as stripeTable,
  activityLogs,
  ActivityType,
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession, getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import {
  validatedAction,
  validatedActionWithUser,
  ActionState,
} from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';
import { createUserKey } from '@/lib/litellm/management';
import { PlanName } from '@/lib/litellm/plans';

async function logActivity(
  stripeId: number,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  await db.insert(activityLogs).values({
    stripeId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  });
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const userResult = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.isGuest, false)),
  });

  if (!userResult || !userResult.passwordHash) {
    return { error: 'Invalid email or password.' };
  }

  const isPasswordValid = await comparePasswords(password, userResult.passwordHash);

  if (!isPasswordValid) {
    return { error: 'Invalid email or password.' };
  }

  let stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, userResult.id) });
  if (!stripeRecord) {
    [stripeRecord] = await db.insert(stripeTable).values({
        userId: userResult.id,
        name: `${userResult.email} subscription`,
    }).returning();
  }
  
  await Promise.all([
    setSession(userResult),
    logActivity(stripeRecord.id, userResult.id, ActivityType.SIGN_IN)
  ]);

  redirect('/chat');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(['free', 'plus', 'pro']).optional(),
  priceId: z.string().optional()
});

export const signUp = async (prevState: ActionState, formData: FormData) => {
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        plan: formData.get('plan') as 'free' | 'plus' | 'pro' | undefined,
        priceId: formData.get('priceId') as string | undefined,
    };

    const validation = signUpSchema.safeParse(data);
    if (!validation.success) {
        return { error: validation.error.errors[0].message };
    }

    const { email, password, plan, priceId } = validation.data;
    
    const session = await getSession();
    const guestUserId = session?.user?.isGuest ? session.user.id : null;

    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser && !existingUser.isGuest) {
        return { error: 'An account with this email already exists.' };
    }

    const passwordHash = await hashPassword(password);
    let finalUser: User;

    if (guestUserId && existingUser?.isGuest) {
        // Convert the existing guest account
        const [updatedUser] = await db.update(users)
            .set({
                email: email,
                passwordHash,
                isGuest: false,
                name: email.split('@')[0],
                updatedAt: new Date(),
            })
            .where(eq(users.id, guestUserId))
            .returning();
        finalUser = updatedUser;
    } else {
        // Create a new user from scratch
        const [createdUser] = await db.insert(users).values({
            email,
            passwordHash,
            name: email.split('@')[0],
        }).returning();
        finalUser = createdUser;
    }

    let stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, finalUser.id) });
    if (!stripeRecord) {
        [stripeRecord] = await db.insert(stripeTable).values({
            userId: finalUser.id,
            name: `${finalUser.email} subscription`,
        }).returning();
    }
    
    await setSession(finalUser);
    await logActivity(stripeRecord.id, finalUser.id, ActivityType.SIGN_UP);

    // -- START: ADDED THIS SECTION --
    try {
        const planToCreate = (plan as PlanName) || 'free';
        await createUserKey(finalUser, planToCreate);
    } catch (e) {
        // This is a critical failure. The user is created but has no API key.
        // You should log this to an error service like Sentry or log files.
        console.error(`CRITICAL: User ${finalUser.id} created but LiteLLM key generation failed.`, e);
        // You might decide to proceed and let the user regenerate the key later,
        // or show an error. For now, we'll proceed.
    }
    // -- END: ADDED THIS SECTION --

    if ((plan === 'plus' || plan === 'pro') && priceId) {
        return createCheckoutSession({ stripeRecord, priceId });
    }

    redirect('/chat');
};

export async function signOut() {
  const user = await getUser();
  if (user && !user.isGuest) {
    const stripeRecord = await db.query.stripe.findFirst({
        where: eq(stripeTable.userId, user.id),
    });
    if (stripeRecord) {
        await logActivity(stripeRecord.id, user.id, ActivityType.SIGN_OUT);
    }
  }
  (await cookies()).delete('session');
  redirect('/sign-in');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    if (!user.passwordHash) return { error: 'Cannot update password for an account without one.' };

    const { currentPassword, newPassword, confirmPassword } = data;
    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
    if (!isPasswordValid) { return { error: 'Current password is incorrect.' }; }
    if (currentPassword === newPassword) { return { error: 'New password must be different.' }; }
    if (confirmPassword !== newPassword) { return { error: 'Passwords do not match.' }; }

    const newPasswordHash = await hashPassword(newPassword);
    const stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, user.id) });

    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));
    if (stripeRecord) await logActivity(stripeRecord.id, user.id, ActivityType.UPDATE_PASSWORD);
    
    return { success: 'Password updated successfully.' };
  }
);

const deleteAccountSchema = z.object({ password: z.string().min(8).max(100) });

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    if (!user.passwordHash) return { error: 'Cannot delete account without password.' };
    const { password } = data;
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) return { error: 'Incorrect password.' };

    await db.delete(users).where(eq(users.id, user.id)); // Hard delete for simplicity, cascades will clean up
    (await cookies()).delete('session');
    redirect('/');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const stripeRecord = await db.query.stripe.findFirst({ where: eq(stripeTable.userId, user.id) });
    
    await db.update(users).set({ name, email }).where(eq(users.id, user.id));
    if (stripeRecord) await logActivity(stripeRecord.id, user.id, ActivityType.UPDATE_ACCOUNT);
    
    return { name, success: 'Account updated successfully.' };
  }
);
'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  stripe as stripeTable,
  activityLogs,
  type NewUser,
  type NewStripe,
  type NewActivityLog,
  ActivityType,
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/payments/stripe';

import { createCheckoutSession } from '@/lib/payments/stripe';
import {
  validatedAction,
  validatedActionWithUser,
  ActionState,
} from '@/lib/auth/middleware';
import { getUser } from '@/lib/db/queries';

async function logActivity(
  stripeId: number,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  const newActivity: NewActivityLog = {
    stripeId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  const foundUser = user[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
      email,
      password
    };
  }

  // Find or create the user's stripe record
  let stripeRecordResult = await db
    .select()
    .from(stripeTable)
    .where(eq(stripeTable.userId, foundUser.id))
    .limit(1);

  let userStripeRecord;
  if (stripeRecordResult.length === 0) {
    const [createdStripe] = await db.insert(stripeTable).values({
      userId: foundUser.id,
      name: `${foundUser.email} subscription`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    userStripeRecord = createdStripe;
  } else {
    userStripeRecord = stripeRecordResult[0];
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(userStripeRecord.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ stripeRecord: userStripeRecord, priceId });
  }

  redirect('/chat');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
  plan: z.enum(['free', 'plus', 'pro']).optional(),
  priceId: z.string().optional()
});

export const signUp = async (prevState: ActionState , formData: FormData) => {
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    inviteId: formData.get('inviteId') as string | undefined,
    plan: formData.get('plan') as 'free' | 'plus' | 'pro' | undefined,
    priceId: formData.get('priceId') as string | undefined,
  };

  const parse = signUpSchema.safeParse(data);
  if (!parse.success) {
    return { error: parse.error.errors[0].message };
  }
  const { email, password, plan, priceId } = data;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      error: 'Email already in use. Please try again.',
      email,
      password
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner'
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email,
      password
    };
  }

  const [createdStripe] = await db.insert(stripeTable).values({
    userId: createdUser.id,
    name: `${email} subscription`,
    planName: plan === 'free' ? 'Free' : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  await setSession(createdUser);

  await logActivity(createdStripe.id, createdUser.id, ActivityType.SIGN_UP);

  let stripeSession;
  if (plan === 'free' || !priceId) {
    redirect('/chat');
  } else if ((plan === 'plus' || plan === 'pro') && priceId) {
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        client_reference_id: String(createdUser.id),
        success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/stripe/cancel`,
      });
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      return {
        error: 'Failed to process payment. Please try again.',
        email,
        password
      };
    }
    if (stripeSession.url) {
      redirect(stripeSession.url);
    } else {
      return { error: 'Failed to create checkout session. Please try again.' };
    }
  } else {
    redirect('/chat');
  }
};

export async function signOut() {
  const user = await getUser();
  if (user) {
    const stripeRecord = await db.query.stripe.findFirst({
        where: eq(stripeTable.userId, user.id),
    });
    if (stripeRecord) {
        await logActivity(stripeRecord.id, user.id, ActivityType.SIGN_OUT);
    }
  }
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    
    const stripeRecord = await db.query.stripe.findFirst({
        where: eq(stripeTable.userId, user.id),
    });

    if (stripeRecord) {
        await Promise.all([
          db
            .update(users)
            .set({ passwordHash: newPasswordHash })
            .where(eq(users.id, user.id)),
          logActivity(stripeRecord.id, user.id, ActivityType.UPDATE_PASSWORD)
        ]);
    } else {
        await db
            .update(users)
            .set({ passwordHash: newPasswordHash })
            .where(eq(users.id, user.id));
    }


    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`
      })
      .where(eq(users.id, user.id));

    (await cookies()).delete('session');
    redirect('/chat');
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
    
    const stripeRecord = await db.query.stripe.findFirst({
        where: eq(stripeTable.userId, user.id),
    });

    if (stripeRecord) {
        await Promise.all([
          db.update(users).set({ name, email }).where(eq(users.id, user.id)),
          logActivity(stripeRecord.id, user.id, ActivityType.UPDATE_ACCOUNT)
        ]);
    } else {
        await db.update(users).set({ name, email }).where(eq(users.id, user.id));
    }


    return { name, success: 'Account updated successfully.' };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z.coerce.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    return { error: 'Team member removal logic not implemented' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    return { error: 'Team member invitation logic not implemented' };
  }
);
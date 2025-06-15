// app/(login)/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminAuthSDK } from '@/lib/firebase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { validatedActionWithUser, ActionState } from '@/lib/auth/middleware';

export async function signOut() {
  // FIX: Await the cookies() function call before using it.
  (await cookies()).delete('session');
  // The redirect will be handled on the client after this action completes.
}

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    await db.update(users).set({ name: data.name, email: data.email }).where(eq(users.id, user.id));
    
    try {
        const adminAuth = getAdminAuthSDK();
        await adminAuth.updateUser(user.id, { email: data.email });
    } catch (error) {
        console.error("Failed to update email in Firebase Auth:", error);
        return { error: "Failed to update email in our authentication provider." };
    }
    
    return { name: data.name, success: 'Account updated successfully.' };
  }
);


export const deleteAccount = async (): Promise<ActionState> => {
    const user = await getUser();
    if (!user) {
        return { error: "User not authenticated" };
    }

    const adminAuth = getAdminAuthSDK();
    
    try {
        await adminAuth.deleteUser(user.id);
        await db.delete(users).where(eq(users.id, user.id));
        (await cookies()).delete('session');

    } catch (error) {
        console.error("Failed to delete account:", error);
        return { error: "Failed to delete your account. Please contact support." };
    }

    redirect('/');
};
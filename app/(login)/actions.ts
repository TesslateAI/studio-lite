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
// Define ActionState type for server actions
export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

export async function signOut() {
  // FIX: Await the cookies() function call before using it.
  (await cookies()).delete('session');
  // The redirect will be handled on the client after this action completes.
}

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = async (
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> => {
  try {
    const user = await getUser();
    if (!user) {
      return { error: "User not authenticated" };
    }

    if (user.isGuest) {
      return { error: "Account upgrade required" };
    }

    // Parse and validate form data
    const validatedFields = updateAccountSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email')
    });

    if (!validatedFields.success) {
      return { 
        error: validatedFields.error.errors[0]?.message || "Invalid input" 
      };
    }

    const { name, email } = validatedFields.data;
    
    await db.update(users).set({ name, email }).where(eq(users.id, user.id));
    
    try {
      const adminAuth = getAdminAuthSDK();
      await adminAuth.updateUser(user.id, { email });
    } catch (error) {
      console.error("Failed to update email in Firebase Auth:", error);
      return { error: "Failed to update email in our authentication provider." };
    }
    
    return { name, success: 'Account updated successfully.' };
  } catch (error) {
    console.error('Update account error:', error);
    return { error: 'Failed to update account' };
  }
};


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
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import CreatorCodesManager from './components/CreatorCodesManager';

export default async function AdminCreatorCodesPage() {
  const user = await getUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/');
  }
  
  // Get all creator profiles with user info
  const creators = await db.select({
    id: creatorProfiles.id,
    code: creatorProfiles.code,
    displayName: creatorProfiles.displayName,
    plusCommissionPercent: creatorProfiles.plusCommissionPercent,
    proCommissionPercent: creatorProfiles.proCommissionPercent,
    freeMonthsPlus: creatorProfiles.freeMonthsPlus,
    isActive: creatorProfiles.isActive,
    totalEarnings: creatorProfiles.totalEarnings,
    totalRedemptions: creatorProfiles.totalRedemptions,
    user: {
      id: users.id,
      email: users.email,
      name: users.name,
    }
  })
  .from(creatorProfiles)
  .innerJoin(users, eq(creatorProfiles.userId, users.id))
  .orderBy(desc(creatorProfiles.createdAt));
  
  // Get all users who could become creators
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  .from(users)
  .orderBy(users.email);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Creator Codes Management</h1>
      
      <CreatorCodesManager 
        creators={creators}
        users={allUsers}
      />
    </div>
  );
}
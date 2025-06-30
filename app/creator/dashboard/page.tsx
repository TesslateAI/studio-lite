import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import CreatorDashboard from './components/CreatorDashboard';

export default async function CreatorDashboardPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  // Check if user is a creator
  const [creatorProfile] = await db.select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, user.id))
    .limit(1);
  
  if (!creatorProfile) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Creator Dashboard</h1>
        <p className="text-muted-foreground">
          You don't have a creator account yet. Contact support to become a creator.
        </p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <CreatorDashboard creatorProfile={creatorProfile} />
    </div>
  );
}
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { creatorProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import CreatorDashboard from './components/CreatorDashboard';
import { PageLayout } from '@/components/layout/page-layout';

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
      <PageLayout 
        title="Creator Dashboard" 
        description="Manage your creator profile and track earnings"
        showBackButton={false}
      >
        <div className="text-center py-12">
          <p className="text-slate-600">
            You don't have a creator account yet. Contact support to become a creator.
          </p>
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title="Creator Dashboard" 
      description="Manage your creator profile and track earnings"
      showBackButton={false}
    >
      <CreatorDashboard creatorProfile={creatorProfile} />
    </PageLayout>
  );
}
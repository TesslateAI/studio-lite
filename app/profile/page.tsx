import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import UserProfile from './components/UserProfile';
import { PageLayout } from '@/components/layout/page-layout';

export default async function ProfilePage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/sign-in');
  }
  
  return (
    <PageLayout 
      title="Profile" 
      description="Manage your account and view your referral status"
      showBackButton={false}
    >
      <UserProfile user={user} />
    </PageLayout>
  );
}
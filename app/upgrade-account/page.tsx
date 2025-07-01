import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import UpgradeAccount from './components/UpgradeAccount';
import { PageLayout } from '@/components/layout/page-layout';

export default async function UpgradeAccountPage() {
  const user = await getUser();
  
  if (!user || !user.isGuest) {
    redirect('/profile');
  }
  
  return (
    <PageLayout 
      title="Create Account" 
      description="Convert your guest account to a full account to unlock all features"
    >
      <UpgradeAccount />
    </PageLayout>
  );
}
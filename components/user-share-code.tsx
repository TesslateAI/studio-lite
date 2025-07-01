'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';

interface ShareCode {
  code: string;
  totalReferrals: number;
  successfulReferrals: number;
  freeMonthsEarned: number;
}

export default function UserShareCode() {
  const [shareCode, setShareCode] = useState<ShareCode | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchShareCode();
  }, []);
  
  const fetchShareCode = async () => {
    try {
      const response = await fetch('/api/creator-codes?action=share-code');
      const data = await response.json();
      
      if (response.ok && data.shareCode) {
        setShareCode(data.shareCode);
      }
    } catch (error) {
      console.error('Failed to fetch share code:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const copyShareLink = () => {
    if (!shareCode) return;
    
    const link = `${window.location.origin}/pricing?ref=${shareCode.code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };
  
  if (loading) {
    return <div className="animate-pulse bg-muted h-48 rounded-lg" />;
  }
  
  if (!shareCode) {
    return null;
  }
  
  const referralsNeeded = 5 - (shareCode.successfulReferrals % 5);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Share & Earn
        </CardTitle>
        <CardDescription>
          Invite friends and earn free months of Plus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <code className="text-lg font-mono bg-muted px-3 py-1 rounded">
            {shareCode.code}
          </code>
          <Button size="sm" onClick={copyShareLink} variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{shareCode.successfulReferrals}</p>
            <p className="text-sm text-muted-foreground">Successful Referrals</p>
          </div>
          
          <div className="text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{shareCode.freeMonthsEarned}</p>
            <p className="text-sm text-muted-foreground">Free Months Earned</p>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm">
            {referralsNeeded === 5 ? (
              <>Invite 5 friends to earn 1 free month of Plus!</>
            ) : (
              <>Only {referralsNeeded} more referral{referralsNeeded !== 1 ? 's' : ''} needed for your next free month!</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
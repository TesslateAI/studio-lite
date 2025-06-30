'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreatorProfile {
  id: number;
  code: string;
  displayName: string | null;
  plusCommissionPercent: string;
  proCommissionPercent: string;
  isActive: boolean;
}

interface Stats {
  redemptions: {
    total: number;
    active: number;
    cancelled: number;
  };
  earnings: {
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
  };
  earningsByPlan: Array<{
    planName: string;
    totalAmount: number;
    count: number;
  }>;
}

interface RecentRedemption {
  id: number;
  userId: string;
  planName: string;
  redeemedAt: string;
  status: string;
}

export default function CreatorDashboard({ creatorProfile }: { creatorProfile: CreatorProfile }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRedemptions, setRecentRedemptions] = useState<RecentRedemption[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, [timeRange]);
  
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/creator-codes/stats?range=${timeRange}`);
      const data = await response.json();
      
      if (response.ok) {
        setStats(data.stats);
        setRecentRedemptions(data.recentRedemptions);
      }
    } catch (error) {
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };
  
  const copyCreatorLink = () => {
    const link = `${window.location.origin}/pricing?creator=${creatorProfile.code}`;
    navigator.clipboard.writeText(link);
    toast.success('Creator link copied to clipboard!');
  };
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };
  
  if (!creatorProfile.isActive) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Creator Dashboard</h1>
        <p className="text-muted-foreground">
          Your creator account is currently inactive. Contact support for assistance.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track your performance and earnings
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Creator Code</CardTitle>
          <CardDescription>Share this code with your audience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <code className="text-2xl font-mono bg-muted px-4 py-2 rounded-lg">
              {creatorProfile.code}
            </code>
            <Button onClick={copyCreatorLink} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Commission rates: {creatorProfile.plusCommissionPercent}% on Plus, {creatorProfile.proCommissionPercent}% on Pro
          </p>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="text-center py-8">Loading stats...</div>
      ) : stats && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.redemptions.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.redemptions.active} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.earnings.totalEarnings)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.earnings.pendingEarnings)} pending
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.earnings.paidEarnings)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.redemptions.total > 0 
                    ? Math.round((stats.redemptions.active / stats.redemptions.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  retention rate
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="redemptions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="redemptions">Recent Redemptions</TabsTrigger>
              <TabsTrigger value="earnings">Earnings by Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="redemptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Redemptions</CardTitle>
                  <CardDescription>Latest users who redeemed your code</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentRedemptions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No redemptions yet
                      </p>
                    ) : (
                      recentRedemptions.map((redemption) => (
                        <div
                          key={redemption.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div>
                            <p className="font-medium">{redemption.planName} Plan</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(redemption.redeemedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              redemption.status === 'active'
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {redemption.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="earnings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings by Plan</CardTitle>
                  <CardDescription>Commission breakdown by subscription type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.earningsByPlan.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No earnings yet
                      </p>
                    ) : (
                      stats.earningsByPlan.map((plan) => (
                        <div key={plan.planName} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{plan.planName} Plan</p>
                              <p className="text-sm text-muted-foreground">
                                {plan.count} subscription{plan.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <p className="font-bold text-lg">
                              {formatCurrency(plan.totalAmount)}
                            </p>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${
                                  (plan.totalAmount / stats.earnings.totalEarnings) * 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
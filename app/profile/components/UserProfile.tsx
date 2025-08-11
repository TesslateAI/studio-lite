'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, CreatorProfile } from '@/lib/db/schema';
import { 
  Crown, Mail, Calendar, Gift, ArrowLeft, DollarSign, Shield, Users,
  Sparkles, TrendingUp, Star, Award, ChevronRight, User2, Settings,
  CreditCard, Share2, Zap, BarChart3, Copy, Check
} from 'lucide-react';
import UserShareCode from '@/components/user-share-code';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  user: User;
  creatorProfile?: CreatorProfile | null;
}

export default function UserProfile({ user, creatorProfile }: UserProfileProps) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  const handleSignUp = () => {
    router.push('/upgrade-account');
  };

  const handleCreatorDashboard = () => {
    router.push('/creator/dashboard');
  };

  const handleAdminPanel = () => {
    router.push('/admin/creator-codes');
  };

  const copyCreatorCode = () => {
    if (creatorProfile?.code) {
      navigator.clipboard.writeText(creatorProfile.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Profile Header Section */}
      <div className="rounded-xl border bg-card p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border border-border">
                <User2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  {user.name || 'Welcome!'}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email || 'Guest User'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={user.isGuest ? "secondary" : "default"}>
                    {user.isGuest ? 'Guest Account' : 'Registered'}
                  </Badge>
                  {user.role === 'admin' && (
                    <Badge variant="destructive">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {creatorProfile && (
                    <Badge className="bg-green-500/10 text-green-700 border-green-200">
                      <Star className="w-3 h-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {user.role === 'admin' && (
                <Button 
                  onClick={handleAdminPanel} 
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                >
                  <Shield className="h-4 w-4 mr-2 text-purple-600" />
                  Admin Panel
                </Button>
              )}
              
              {creatorProfile && (
                <Button 
                  onClick={handleCreatorDashboard} 
                  variant="outline"
                  className="border-green-200 hover:bg-green-50 hover:border-green-300"
                >
                  <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
                  Creator Dashboard
                </Button>
              )}
              
              {user.isGuest && (
                <Button 
                  onClick={handleSignUp} 
                  className="bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <p className="text-xs">Member Since</p>
              </div>
              <p className="text-sm font-semibold">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="w-4 h-4" />
                <p className="text-xs">Current Plan</p>
              </div>
              <p className="text-sm font-semibold">{user.isGuest ? 'Free (Guest)' : 'Free'}</p>
            </div>
            {creatorProfile && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-xs">Total Earnings</p>
                </div>
                <p className="text-sm font-semibold">${(creatorProfile.totalEarnings / 100).toFixed(2)}</p>
              </div>
            )}
            {creatorProfile && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <p className="text-xs">Redemptions</p>
                </div>
                <p className="text-sm font-semibold">{creatorProfile.totalRedemptions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions for Guest Users */}
      {user.isGuest && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-6 h-6 text-orange-600" />
                  <h2 className="text-xl font-bold">Unlock Full Features</h2>
                </div>
                <p className="text-muted-foreground mb-4 max-w-lg">
                  Create a permanent account to save your work, earn rewards, and access premium features.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Save and sync across devices</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Earn free months through referrals</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Access to premium plans</span>
                  </li>
                </ul>
                <Button 
                  onClick={handleSignUp}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Create Your Account Now
                </Button>
              </div>
              <Sparkles className="hidden lg:block w-24 h-24 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creator Stats Dashboard */}
      {creatorProfile && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCreatorDashboard}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
              <p className="text-2xl font-bold">${(creatorProfile.totalEarnings / 100).toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-2">View details →</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCreatorDashboard}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Redemptions</p>
              <p className="text-2xl font-bold">{creatorProfile.totalRedemptions}</p>
              <p className="text-xs text-blue-600 mt-2">Active creator code</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <button onClick={copyCreatorCode} className="text-purple-600 hover:text-purple-700 transition-colors">
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Creator Code</p>
              <p className="text-xl font-bold font-mono">{creatorProfile.code}</p>
              <p className="text-xs text-purple-600 mt-2">{creatorProfile.displayName}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>Manage your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                  <p className="text-lg font-medium">{user.name || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <p className="text-lg font-medium">{user.email || 'Guest User'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Status</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isGuest ? "secondary" : "default"} className="px-3 py-1">
                      {user.isGuest ? 'Guest' : 'Verified'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? "destructive" : "outline"} className="px-3 py-1">
                      {user.role === 'admin' ? (
                        <><Shield className="w-3 h-3 mr-1" /> Admin</>
                      ) : (
                        user.role
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription Details
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {user.isGuest ? 'Limited free access' : 'Free tier with full features'}
                      </p>
                    </div>
                    <Button 
                      onClick={handleUpgrade} 
                      variant="outline"
                    >
                      Upgrade Plan
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Share Code Card - Only for registered users */}
          {!user.isGuest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <UserShareCode />
              </CardContent>
            </Card>
          )}

          {/* Admin Quick Actions */}
          {user.role === 'admin' && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  Admin Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => router.push('/admin/creator-codes')}
                  variant="ghost"
                  className="w-full justify-between hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Creator Codes
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
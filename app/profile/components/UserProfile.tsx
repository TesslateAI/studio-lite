'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from '@/lib/db/schema';
import { Crown, Mail, Calendar, Gift, ArrowLeft } from 'lucide-react';
import UserShareCode from '@/components/user-share-code';
import { useRouter } from 'next/navigation';

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  const handleSignUp = () => {
    // For guest users, redirect to upgrade account page
    router.push('/upgrade-account');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {user.isGuest && (
          <Button onClick={handleSignUp} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white">
            <Crown className="h-4 w-4" />
            Create Account
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-medium">
                {user.email || 'Not provided'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="font-medium">
                {user.name || 'Not provided'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.isGuest ? "secondary" : "default"}>
                  {user.isGuest ? 'Guest' : 'Registered'}
                </Badge>
                <Badge variant={user.role === 'admin' ? "destructive" : "outline"}>
                  {user.role}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>

            {user.isGuest && (
              <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                      Guest Account Limitations
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Create a full account to save your chat history, earn referral rewards, and access premium features.
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-3 bg-slate-900 hover:bg-slate-800 text-white"
                      onClick={handleSignUp}
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share Code Card - Only for registered users */}
        {!user.isGuest && <UserShareCode />}
      </div>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {user.isGuest ? 'Free (Guest)' : 'Free'}
              </p>
            </div>
            <Button onClick={handleUpgrade} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {user.isGuest && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">
              Unlock Full Features
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              Create a permanent account to access all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                Save and sync your chat history across devices
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                Earn free months by referring friends
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                Access to premium subscription plans
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                Priority customer support
              </li>
            </ul>
            
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleSignUp}
            >
              Create Your Account Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
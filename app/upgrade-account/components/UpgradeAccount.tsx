'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getClientAuth } from '@/lib/firebase/client';
import { linkWithCredential, EmailAuthProvider } from 'firebase/auth';

export default function UpgradeAccount() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      
      if (!user || !user.isAnonymous) {
        setError('No guest account found');
        return;
      }

      // Create credential for linking
      const credential = EmailAuthProvider.credential(email, password);
      
      // Link anonymous account with email/password
      const result = await linkWithCredential(user, credential);
      
      // Update session on server
      const idToken = await result.user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, isGuest: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      // Redirect to profile
      router.push('/profile');
      router.refresh();
      
    } catch (err: any) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists. Please sign in instead.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        default:
          setError(err.message || 'Failed to upgrade account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-slate-100 rounded-full">
            <Crown className="h-8 w-8 text-slate-600" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Benefits</CardTitle>
          <CardDescription>
            What you'll get with a permanent account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Save and sync chat history</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Earn free months by referring friends</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Access to premium plans</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span>Priority support</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>
            Add email and password to your existing account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpgrade} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Create a password"
                  minLength={6}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Confirm your password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
              {loading ? 'Upgrading...' : 'Upgrade Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/profile')}
          className="text-slate-600 hover:text-slate-900"
        >
          Maybe later
        </Button>
      </div>
    </div>
  );
}
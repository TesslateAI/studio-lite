'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Trash2, Loader2, MailCheck, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { deleteAccount } from '@/app/(login)/actions';
import { getClientAuth } from '@/lib/firebase/client';
import { sendPasswordResetEmail } from 'firebase/auth';
import useSWR from 'swr';
import { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SecurityPage() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [isDeletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetError, setResetError] = useState('');

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        setDeletePending(true);
        setDeleteError('');
        const result = await deleteAccount();
        if (result?.error) {
            setDeleteError(result.error);
            setDeletePending(false);
        }
        // On success, the server action will redirect, so no need to handle success state here.
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
        setResetError("Could not find your email address.");
        setResetStatus('error');
        return;
    }
    setResetStatus('loading');
    setResetError('');
    try {
        const auth = getClientAuth();
        await sendPasswordResetEmail(auth, user.email);
        setResetStatus('success');
    } catch (error) {
        setResetError('Failed to send password reset email. Please try again later.');
        setResetStatus('error');
        console.error("Password reset error:", error);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                To change your password, we'll send a secure link to your registered email address.
            </p>
            {resetStatus === 'idle' && (
                 <Button
                    onClick={handlePasswordReset}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                    disabled={!user}
                >
                    <Lock className="mr-2 h-4 w-4" />
                    Send Password Reset Link
                </Button>
            )}
            {resetStatus === 'loading' && (
                <Button disabled className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                </Button>
            )}
            {resetStatus === 'success' && (
                 <div className="flex items-center text-green-600 text-sm p-3 bg-green-50 rounded-md">
                    <MailCheck className="h-5 w-5 mr-3 flex-shrink-0" />
                    Reset link sent! Please check your email inbox.
                </div>
            )}
            {resetStatus === 'error' && (
                <div className="flex items-center text-red-600 text-sm p-3 bg-red-50 rounded-md">
                    <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    {resetError}
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            This will permanently delete your account, subscriptions, and all associated data. This action is irreversible.
          </p>
            {deleteError && (
              <p className="text-red-500 text-sm">{deleteError}</p>
            )}
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete My Account
                </>
              )}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
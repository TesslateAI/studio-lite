'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Pen, Sun, Moon, User as UserIcon, Key, Crown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/db/schema';
import useSWR from 'swr';
import Image from "next/image"
import { useDarkMode } from '@/components/DarkModeProvider';
import { getClientAuth } from '@/lib/firebase/client';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { signOut as serverSignOut } from '@/app/(login)/actions';
import { DiscordIcon } from '@/components/icons/discord';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getPlanBadge(planName?: string) {
  switch (planName) {
    case "Pro":
      return { ring: "ring-1 ring-slate-300", color: "bg-slate-600", label: "Pro" };
    case "Plus":
      return { ring: "ring-1 ring-slate-300", color: "bg-slate-500", label: "Plus" };
    default:
      return { ring: "", color: "", label: "" };
  }
}

function UserDropdown({ email, userInitials, planName, isGuest }: { email: string, userInitials?: string, planName?: string, isGuest?: boolean }) {
  const initials = userInitials || (email.trim()[0] || '').toUpperCase();
  const { ring, color, label } = getPlanBadge(planName);
  const router = useRouter();
  const { darkMode, setDarkMode } = useDarkMode();

  const handleLogout = async () => {
    try {
      // 1. Sign out from the client-side Firebase instance
      const auth = getClientAuth();
      await firebaseSignOut(auth);
      
      // 2. Clear local storage (optional but good practice)
      localStorage.removeItem('tesslateStudioLiteChatHistory');
      localStorage.removeItem('tesslateStudioLiteActiveChatId');
      
      // 3. Call the server action to clear the server-side session cookie
      try {
        await serverSignOut();
      } catch (serverError) {
        console.warn('Server sign out failed, but continuing with client-side logout:', serverError);
      }
      
      // 4. Redirect to the home page
      router.push("/");
      router.refresh(); // Force a full refresh to clear any stale data
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, still try to redirect to clear the UI state
      router.push("/");
      router.refresh();
    }
  };

  if (isGuest) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
            <span className="relative flex items-center justify-center">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">G</AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium text-slate-900">Guest</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <UserIcon className="h-4 w-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/sign-up')}>
            Sign Up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/sign-in')}>
            Login
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 h-auto rounded-md hover:bg-slate-50 transition-colors">
          <span className="relative flex items-center justify-center">
            <span className={`rounded-full ${ring} p-0.5`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm font-medium bg-slate-100 text-slate-900">{initials}</AvatarFallback>
              </Avatar>
            </span>
            {label && (
              <span
                className={`absolute left-1/2 -translate-x-1/2 -bottom-2 px-2 py-0.5 rounded-full text-xs font-bold text-white ${color} shadow-sm`}
                style={{ minWidth: 32, textAlign: "center" }}
                title={label}
              >
                {label}
              </span>
            )}
          </span>
          <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-32 truncate">
            {email.split('@')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-md border-slate-200 shadow-lg bg-white" align="end" forceMount>
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm font-medium bg-slate-100 text-slate-900">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-slate-900">{email.split('@')[0]}</div>
              <div className="text-sm text-slate-500">{email}</div>
            </div>
          </div>
        </div>
        
        <div className="py-1">
          <DropdownMenuItem onClick={() => router.push("/profile")} className="gap-2 py-2 px-3 font-medium hover:bg-slate-50 transition-colors">
            <UserIcon className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDarkMode(!darkMode)} className="gap-2 py-2 px-3 font-medium hover:bg-slate-50 transition-colors">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/upgrade")} className="gap-2 py-2 px-3 font-medium hover:bg-slate-50 transition-colors">
            <Crown className="h-4 w-4" />
            Upgrade Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings/general")} className="gap-2 py-2 px-3 font-medium hover:bg-slate-50 transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-slate-200" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2 py-2 px-3 font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ isGuest = false, onNewChat }: { isGuest?: boolean, onNewChat?: () => void }) {
  const { data: user, isLoading: userLoading } = useSWR<User>('/api/user', fetcher);
  const { data: stripeData } = useSWR(user && !user.isGuest ? '/api/stripe/user' : null, fetcher);
  const userPlanName = stripeData?.planName;
  const { darkMode, setDarkMode } = useDarkMode();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="w-full px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group transition-colors cursor-pointer">
          <div className="relative bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <Image
              src="/tesslate-logo.svg"
              alt="Tesslate Logo"
              width={24}
              height={24}
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-slate-900 tracking-tight">
              Designer
            </span>
            <span className="text-xs font-medium text-slate-500 tracking-wider uppercase">
              Studio
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-3">
            {/* Canvas/Chat Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <Link href="/chat">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-7 px-3 text-xs font-medium rounded-md transition-all",
                    pathname === '/chat' 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Chat
                </Button>
              </Link>
              <Link href="/canvas">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-7 px-3 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                    pathname === '/canvas' 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Canvas
                  <span className="px-1 py-0.5 text-[9px] font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded">
                    BETA
                  </span>
                </Button>
              </Link>
            </div>
            
            <Link href="/dashboard/keys" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2">
              <Key className="h-4 w-4" />
              Get API Key
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Discord Link */}
            <Link 
              href="https://discord.gg/DkzMzwBTaw" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
              aria-label="Join our Discord"
            >
              <DiscordIcon className="h-5 w-5" />
            </Link>
            
            {/* New Chat Button for Guests */}
            {isGuest && onNewChat && (
              <Button
                onClick={onNewChat}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
              >
                <Pen className="h-4 w-4" />
                New Chat
              </Button>
            )}

            <Suspense fallback={<div className="h-12" />}>
              {userLoading ? (
                <div className="h-12 w-24 bg-slate-200 animate-pulse rounded-md"></div>
              ) : user ? (
                <UserDropdown email={user.email || ''} userInitials={user.name ? (user.name.trim()[0] || '').toUpperCase() : undefined} planName={userPlanName || ''} isGuest={user.isGuest} />
              ) : (
                <div className="flex items-center gap-3">
                  <Button asChild className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors">
                    <Link href="/sign-in">Login</Link>
                  </Button>
                  <Button asChild className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors">
                    <Link href="/sign-up">Sign Up</Link>
                  </Button>
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}

export function DashboardLayout({ children, isGuest = false, onNewChat }: { children: React.ReactNode, isGuest?: boolean, onNewChat?: () => void }) {
  return (
    <section className="flex flex-col h-[100dvh] overflow-hidden">
      <Header isGuest={isGuest} onNewChat={onNewChat} />
      {children}
    </section>
  );
}
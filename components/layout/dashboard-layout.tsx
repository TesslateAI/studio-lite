'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Crown, LogOut, Settings, Pen, Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import Image from "next/image"
import { useDarkMode } from '@/components/DarkModeProvider';
import { getClientAuth } from '@/lib/firebase/client';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { signOut as serverSignOut } from '@/app/(login)/actions';
import { StatusIndicator } from '@/components/ui/status-indicator';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getPlanBadge(planName?: string) {
  switch (planName) {
    case "Pro":
      return { ring: "ring-2 ring-green-600", color: "bg-green-600", label: "Pro" };
    case "Plus":
      return { ring: "ring-2 ring-blue-500", color: "bg-blue-500", label: "Plus" };
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
      // 1. Sign out from the client-side Firebase instance
      const auth = getClientAuth();
      await firebaseSignOut(auth);
      
      // 2. Clear local storage (optional but good practice)
      localStorage.removeItem('tesslateStudioLiteChatHistory');
      localStorage.removeItem('tesslateStudioLiteActiveChatId');
      
      // 3. Call the server action to clear the server-side session cookie
      await serverSignOut();
      
      // 4. Redirect to the home page
      router.push("/");
      router.refresh(); // Force a full refresh to clear any stale data
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
              <span className="ml-2 text-sm font-medium text-gray-900">Guest</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount>
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
        <Button variant="ghost" className="flex items-center gap-3 px-3 py-2.5 h-auto rounded-xl hover:bg-[#5E62FF]/5 transition-all duration-200">
          <span className="relative flex items-center justify-center">
            <span className={`rounded-full ${ring} p-0.5`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white">{initials}</AvatarFallback>
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
          <span className="hidden sm:block text-sm font-semibold text-gray-800 max-w-32 truncate">
            {email.split('@')[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 rounded-2xl border-gray-200/50 shadow-2xl bg-white/95 backdrop-blur-xl" align="end" forceMount>
        <div className="px-4 py-4 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-base font-bold bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-gray-900">{email.split('@')[0]}</div>
              <div className="text-sm text-gray-500">{email}</div>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <DropdownMenuItem onClick={() => setDarkMode(!darkMode)} className="gap-3 py-3 px-3 rounded-xl font-medium hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/upgrade")} className="gap-3 py-3 px-3 rounded-xl font-medium hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">
            <Crown className="h-5 w-5" />
            Upgrade Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings/general")} className="gap-3 py-3 px-3 rounded-xl font-medium hover:bg-[#5E62FF]/5 hover:text-[#5E62FF] transition-all duration-200">
            <Settings className="h-5 w-5" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2 bg-gray-200/50" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-3 py-3 px-3 rounded-xl font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ isGuest = false, onNewChat }: { isGuest?: boolean, onNewChat?: () => void }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: stripeData } = useSWR(user && !user.isGuest ? '/api/stripe/user' : null, fetcher);
  const userPlanName = stripeData?.planName;
  const { darkMode, setDarkMode } = useDarkMode();
  const [imgSrc, setImgSrc] = useState("/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png");

  useEffect(() => {
    const img = new window.Image();
    img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
    img.onerror = () => setImgSrc("/Asset_108x.png");
  }, []);

  return (
    <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="w-full px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#5E62FF]/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative bg-gradient-to-r from-[#5E62FF] to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-[#5E62FF]/25">
              <Image
                src={imgSrc}
                alt="Tesslate Logo"
                width={28}
                height={28}
                priority
                className="relative z-10"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
              Designer
            </span>
            <span className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
              Studio
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/chat" className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200">
              Chat
            </Link>
            <Link href="/settings" className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200">
              Settings
            </Link>
            <Link href="/upgrade" className="px-4 py-2.5 rounded-xl font-semibold text-gray-700 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5 transition-all duration-200 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Upgrade
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <StatusIndicator />
            
            {/* New Chat Button for Guests */}
            {isGuest && onNewChat && (
              <Button
                onClick={onNewChat}
                className="group relative overflow-hidden px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white font-semibold shadow-lg shadow-[#5E62FF]/25 hover:shadow-xl hover:shadow-[#5E62FF]/40 transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-[#5E62FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <Pen className="h-4 w-4" />
                  New Chat
                </span>
              </Button>
            )}
          
            {/* Dark Mode Toggle */}
            <button
              aria-label="Toggle dark mode"
              className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-600 hover:text-[#5E62FF]"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <Suspense fallback={<div className="h-12" />}>
              {user ? (
                <UserDropdown email={user.email || ''} userInitials={user.name ? (user.name.trim()[0] || '').toUpperCase() : undefined} planName={userPlanName || ''} isGuest={user.isGuest} />
              ) : (
                <div className="flex items-center gap-3">
                  <Button asChild className="px-6 py-2.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold hover:border-gray-400 transition-all duration-300">
                    <Link href="/sign-in">Login</Link>
                  </Button>
                  <Button asChild className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5E62FF] to-purple-600 text-white font-semibold shadow-lg shadow-[#5E62FF]/25 hover:shadow-xl hover:shadow-[#5E62FF]/40 transition-all duration-300 transform hover:scale-105">
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
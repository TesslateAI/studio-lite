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
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import Image from "next/image"
import { useDarkMode } from '@/components/DarkModeProvider';
import { getClientAuth } from '@/lib/firebase/client';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { signOut as serverSignOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';

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
          <DropdownMenuItem
              onClick={() => {
                console.log("Clicked on sign up");
                router.refresh(); // Optional, helps with router state
                router.push('/sign-up');
              }}
          >
            Sign Up
          </DropdownMenuItem>
          <DropdownMenuItem
              onClick={() => {
                console.log("Clicked on login");
                router.refresh(); // Optional, helps with router state
                router.push('/sign-in');
              }}
          >
            Log In
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto">
          <span className="relative flex items-center justify-center">
            <span className={`rounded-full ${ring} p-0.5`}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </span>
            {label && (
              <span
                className={`absolute left-1/2 -translate-x-1/2 -bottom-2 px-2 py-0.5 rounded-full text-xs font-bold text-white ${color} `}
                style={{ minWidth: 32, textAlign: "center" }}
                title={label}
              >
                {label}
              </span>
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <div className="px-3 py-2 text-sm font-medium text-foreground border-b">{email}</div>
        <DropdownMenuItem onClick={() => setDarkMode(!darkMode)} className="gap-2 py-2">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/pricing")} className="gap-2 py-2">
          <Crown className="h-4 w-4" />
          Upgrade Plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/general")} className="gap-2 py-2">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 py-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
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
  const router = useRouter();
  useEffect(() => {
    const img = new window.Image();
    img.src = "/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png";
    img.onerror = () => setImgSrc("/Asset_108x.png");
  }, []);

  return (
    <header className="border-b border-gray-200">
      <div className="w-full px-2 py-4 flex justify-between items-center">
        <span
            className="flex items-center cursor-pointer"
            onClick={() => {
              console.log("Clicked on logo");
              router.push('/');
            }}
        >
          <Image
            src={imgSrc}
            alt="Tesslate Logo"
            width={24}
            height={24}
            priority
          />
          <span className="ml-2 text-xl font-medium text-gray-900">Designer</span>
        </span>
        <div className="flex items-center space-x-2">
          <Suspense fallback={<div className="h-9" />}>
            {user ? (
              <UserDropdown email={user.email || ''} userInitials={user.name ? (user.name.trim()[0] || '').toUpperCase() : undefined} planName={userPlanName || ''} isGuest={user.isGuest} />
            ) : (
              <div className="flex items-center" style={{ marginLeft: 'auto' }}>
                 <button
                    aria-label="Toggle dark mode"
                    className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 ml-2">
                  <Link href="/sign-in">Login</Link>
                </Button>
                <Button asChild className="bg-zinc-900 text-white hover:bg-zinc-800 ml-2">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </div>
            )}
          </Suspense>
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
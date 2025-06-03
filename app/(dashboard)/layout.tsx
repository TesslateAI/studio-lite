'use client';

import Link from 'next/link';
import { use, useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CircleIcon, Home, LogOut, Settings, Crown, HelpCircle, FileText, Shield, ChevronDown, Moon, Sun, Pen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import Image from "next/image"
import { useDarkMode } from '@/components/DarkModeProvider';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserDropdown({ email, userInitials }: { email: string, userInitials?: string }) {
  const initials = userInitials || (email.trim()[0] || '').toUpperCase();
  const router = useRouter();
  const { darkMode, setDarkMode } = useDarkMode();
  const handleMenuClick = (action: string) => {
    if (action === "Upgrade Plan") {
      router.push("/pricing");
    } else if (action === "Settings") {
      router.push("/settings/general");
    } else if (action === "Log out") {
      // Clear chat history/session before logging out
      localStorage.removeItem('tesslateStudioLiteChatHistory');
      localStorage.removeItem('tesslateStudioLiteActiveChatId');
      signOut().then(() => {
        router.refresh();
        router.push("/");
      });
    } else {
      // Implement other actions as needed
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap- px-2 py-1 h-auto">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <div className="px-3 py-2 text-sm font-medium text-foreground border-b">{email}</div>
        <DropdownMenuItem onClick={() => setDarkMode(!darkMode)} className="gap-2 py-2">
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick("Upgrade Plan")} className="gap-2 py-2">
          <Crown className="h-4 w-4" />
          Upgrade Plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleMenuClick("Settings")} className="gap-2 py-2">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 py-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          Help & FAQ
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 py-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          Release notes
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2 py-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          Terms & policies
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleMenuClick("Log out")}
          className="gap-2 py-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
        <div className="px-3 py-2 text-xs text-muted-foreground border-t">
          Logging out will clear your chat history and session data.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header({ isGuest = false, onNewChat }: { isGuest?: boolean, onNewChat?: () => void }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { darkMode, setDarkMode } = useDarkMode();

  // Clear guest chat history when a user logs in
  useEffect(() => {
    if (user) {
      localStorage.removeItem('tesslateStudioLiteChatHistory');
      localStorage.removeItem('tesslateStudioLiteActiveChatId');
    }
  }, [user]);

  return (
    <header className="border-b border-gray-200">
      <div className="w-full px-2 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image src="/44959608-1a8b-4b19-8b7a-5172b49f8fbc.png" alt="Tesslate Logo" width={24} height={24} className="ml-2" />
          <span className="ml-2 text-xl font-semibold text-gray-900">Designer</span>
        </Link>
        <div className="flex items-center space-x-2">
          <Suspense fallback={<div className="h-9" />}>
            {user ? (
              <UserDropdown email={user.email || ''} userInitials={user.name ? (user.name.trim()[0] || '').toUpperCase() : undefined} />
            ) : (
              <div className="flex items-center" style={{ marginLeft: '120px' }}>
                {/* Move dark mode button next to New Chat for guests */}
                {isGuest ? (
                  <>
                    <button
                      aria-label="Toggle dark mode"
                      className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                      onClick={() => setDarkMode(!darkMode)}
                    >
                      {darkMode ? (
                        <Sun className="h-5 w-5 text-white-400" />
                      ) : (
                        <Moon className="h-5 w-5 text-black" />
                      )}
                    </button>
                    {onNewChat && (
                      <button
                        onClick={onNewChat}
                        className="bg-gray-200 text-black hover:bg-zinc-100 ml-2 p-2 rounded-md transition flex items-center gap-2"
                        aria-label="New Chat"
                        title="New Chat"
                      >
                        <Pen className="h-5 w-5" />
                        <span className="text-xs font-medium">New Chat</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    aria-label="Toggle dark mode"
                    className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                    onClick={() => setDarkMode(!darkMode)}
                  >
                    {darkMode ? (
                      <Sun className="h-5 w-5 text-white-400" />
                    ) : (
                      <Moon className="h-5 w-5 text-black" />
                    )}
                  </button>
                )}
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

export default function Layout({ children, isGuest = false, onNewChat }: { children: React.ReactNode, isGuest?: boolean, onNewChat?: () => void }) {
  return (
    <section className="flex flex-col h-[100dvh] overflow-hidden">
      <Header isGuest={isGuest} onNewChat={onNewChat} />
      {children}
    </section>
  );
}

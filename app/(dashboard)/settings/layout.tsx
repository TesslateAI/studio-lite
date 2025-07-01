'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, Shield, Activity, Menu, CreditCard } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';

export default function SettingsLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: '/settings/general', icon: Settings, label: 'General' },
    { href: '/settings/activity', icon: Activity, label: 'Activity' },
    { href: '/settings/security', icon: Shield, label: 'Security' },
    { href: '/settings', icon: CreditCard, label: 'Subscription' },
  ];

  // Get page title based on current path
  const getPageTitle = () => {
    const navItem = navItems.find(item => item.href === pathname);
    return navItem ? `Settings - ${navItem.label}` : 'Settings';
  };

  const getPageDescription = () => {
    switch (pathname) {
      case '/settings/general':
        return 'Manage your account information and preferences';
      case '/settings/activity':
        return 'View your account activity and logs';
      case '/settings/security':
        return 'Manage your password and security settings';
      case '/settings':
        return 'Manage your subscription and billing';
      default:
        return 'Manage your account settings';
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <PageHeader 
          title={getPageTitle()}
          description={getPageDescription()}
          showBackButton={false}
        />
        
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile menu button */}
          <div className="lg:hidden fixed bottom-4 right-4 z-50">
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full p-3 shadow-lg"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle settings menu</span>
            </Button>
          </div>

          {/* Sidebar */}
          <aside
            className={`w-64 bg-slate-50 border-r border-slate-200 lg:block ${
              isSidebarOpen ? 'block' : 'hidden'
            } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <nav className="h-full overflow-y-auto p-4">
              <Link href="/chat" passHref>
                <Button variant="outline" className="mb-4 w-full justify-start border-slate-300 text-slate-700 hover:bg-slate-100">
                  ← Back to Chat
                </Button>
              </Link>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} passHref>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 ${
                        pathname === item.href 
                          ? 'bg-slate-100 text-slate-900 font-medium' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

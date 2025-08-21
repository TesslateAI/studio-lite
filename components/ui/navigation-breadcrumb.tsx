"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export function NavigationBreadcrumb() {
  const pathname = usePathname();
  
  // Skip breadcrumbs on home page
  if (pathname === '/') return null;
  
  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = [
    { label: 'Dashboard', href: '/chat', icon: Home },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      
      // Improve label naming for better UX
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      if (segment === 'upgrade-account') label = 'Create Account';
      if (segment === 'creator-codes') label = 'Creator Codes';
      if (segment === 'dashboard') label = 'Dashboard';
      if (segment === 'keys') label = 'API Keys';
      
      return { label, href };
    })
  ];

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {breadcrumbItems.map((item, index) => (
        <Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <Link
            href={item.href}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors font-medium ${
              index === breadcrumbItems.length - 1
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {'icon' in item && item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
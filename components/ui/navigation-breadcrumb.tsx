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
    { label: 'Home', href: '/', icon: Home },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, href };
    })
  ];

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-xl px-4 py-2.5 shadow-sm">
      {breadcrumbItems.map((item, index) => (
        <Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <Link
            href={item.href}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 font-medium ${
              index === breadcrumbItems.length - 1
                ? 'text-[#5E62FF] bg-[#5E62FF]/10'
                : 'text-gray-600 hover:text-[#5E62FF] hover:bg-[#5E62FF]/5'
            }`}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
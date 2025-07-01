"use client";

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NavigationBreadcrumb } from './navigation-breadcrumb';
import { Button } from './button';

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  breadcrumbs?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  showBackButton = true, 
  breadcrumbs = true,
  actions 
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {breadcrumbs && (
            <div className="mb-4">
              <NavigationBreadcrumb />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="p-2 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                {description && (
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                )}
              </div>
            </div>
            
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
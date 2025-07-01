"use client";

import { DashboardLayout } from './dashboard-layout';
import { PageHeader } from '../ui/page-header';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  showBackButton?: boolean;
  breadcrumbs?: boolean;
  actions?: React.ReactNode;
  isGuest?: boolean;
  onNewChat?: () => void;
}

export function PageLayout({ 
  children, 
  title, 
  description, 
  showBackButton = true,
  breadcrumbs = true,
  actions,
  isGuest = false,
  onNewChat
}: PageLayoutProps) {
  return (
    <DashboardLayout isGuest={isGuest} onNewChat={onNewChat}>
      <div className="flex flex-col h-full">
        <PageHeader 
          title={title}
          description={description}
          showBackButton={showBackButton}
          breadcrumbs={breadcrumbs}
          actions={actions}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
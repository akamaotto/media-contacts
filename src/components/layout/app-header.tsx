"use client";

import React from 'react';
import AppBrandHeader from '@/components/features/media-contacts/app-brand-header';
import HeaderActionButtons from '@/components/features/media-contacts/header-action-buttons';
import { usePathname } from 'next/navigation';

interface AppHeaderProps {
  onAddContactOpen?: () => void;
}

export function AppHeader({ onAddContactOpen }: AppHeaderProps) {
  const pathname = usePathname();
  
  // Determine if we're on the home page
  const isHomePage = pathname === '/';
  
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-950 py-4 px-6">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <AppBrandHeader 
          title="Media Contacts"
          subtitle="Manage and enrich your media relationships"
          totalCount={0}
          onAddContact={isHomePage && onAddContactOpen ? onAddContactOpen : () => (window.location.href = '/')} 
        />
        <div className="flex justify-end w-full sm:w-auto">
          <HeaderActionButtons 
            onAddContactOpen={isHomePage && onAddContactOpen ? onAddContactOpen : () => window.location.href = '/'} 
          />
        </div>
      </div>
    </header>
  );
}

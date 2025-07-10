"use client";

import React, { useState } from 'react';
import { AppHeader } from './app-header';
import { UpdateMediaContactSheet } from '@/components/media-contacts/update-media-contact-sheet';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  
  const handleAddContactOpen = () => {
    setIsAddContactOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader onAddContactOpen={handleAddContactOpen} />
      <main className="flex-1 bg-gray-50 dark:bg-zinc-900">
        {children}
      </main>
      
      {/* Add Contact Sheet */}
      {isAddContactOpen && (
        <UpdateMediaContactSheet
          isOpen={isAddContactOpen}
          onOpenChange={setIsAddContactOpen}
          contact={null} // null means we're adding a new contact
          onContactUpdate={() => {
            setIsAddContactOpen(false);
            // We would typically refresh data here, but that's handled by individual pages
          }}
        />
      )}
    </div>
  );
}

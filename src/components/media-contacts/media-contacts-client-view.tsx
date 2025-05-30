"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediaContactsTable } from '@/components/media-contacts/media-contacts-table';
import { MediaContactTableItem } from '@/components/media-contacts/columns';
import { UpdateMediaContactSheet } from '@/components/media-contacts/update-media-contact-sheet';
import HeaderActionButtons from '@/components/media-contacts/header-action-buttons';
import AppBrandHeader from '@/components/media-contacts/app-brand-header';

interface MediaContactsClientViewProps {
  initialContacts: MediaContactTableItem[];
  totalContactsCount: number; // Kept for now, can be removed if not used
}

export function MediaContactsClientView({ initialContacts, totalContactsCount }: MediaContactsClientViewProps) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<MediaContactTableItem | null>(null);

  const handleDataRefresh = () => {
    router.refresh();
  };

  const handleAddContactOpen = () => {
    setEditingContact(null);
    setIsSheetOpen(true);
  };

  const handleEditContactOpen = (contact: MediaContactTableItem) => {
    setEditingContact(contact);
    setIsSheetOpen(true);
  };
  
  const handleContactUpserted = () => {
    handleDataRefresh();
    setIsSheetOpen(false);
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="flex flex-row justify-between items-center gap-4 mb-12">
        <AppBrandHeader />
        <HeaderActionButtons onAddContactOpen={handleAddContactOpen} />
      </header>
      <main>
        {initialContacts.length > 0 ? (
          <MediaContactsTable 
            data={initialContacts} 
            onDataRefresh={handleDataRefresh}
            onEditContact={handleEditContactOpen} // This prop needs to be added to MediaContactsTableProps
          />
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No media contacts found. You can start by adding a new contact.
          </div>
        )}
      </main>
      <UpdateMediaContactSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen} 
        contact={editingContact} 
        onContactUpdate={handleContactUpserted} 
      />
    </div>
  );
}

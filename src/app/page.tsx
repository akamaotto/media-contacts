import React, { Suspense } from 'react';
// IMPORTANT: Adjust this import path if MediaContactTableItem is defined elsewhere.
// This was previously in 'src/components/media-contacts-feature/columns.tsx' which was deleted.
// Assuming it's now in 'src/components/media-contacts/columns.tsx'
import { MediaContactTableItem } from '@/components/media-contacts/columns';
import { MediaContactsClientView } from '@/components/media-contacts/media-contacts-client-view';
import { getMediaContactsAction } from '@/backend/media-contacts/actions'; // Import the server action

// No longer need prisma directly in the page component for this fetch
// import { prisma } from '@/lib/prisma';

// The local getMediaContacts function is removed, as we're using the server action.

export default async function HomePage() {
  // Fetch initial media contacts using the server action
  // This action will run on the server.
  let initialMediaContacts: MediaContactTableItem[] = [];
  let errorFetchingContacts: string | null = null;

  try {
    initialMediaContacts = await getMediaContactsAction();
  } catch (error) {
    console.error("Error fetching media contacts in HomePage:", error);
    errorFetchingContacts = "Failed to load media contacts. Please try again later.";
    // Optionally, you could render a more specific error message or component
    // based on the error type if your action provides more details.
  }

  // If there was an error, you might want to render an error message
  // instead of or in addition to the client view.
  if (errorFetchingContacts) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-red-600 bg-red-100 border border-red-400 p-4 rounded-md">
          <p><strong>Error:</strong> {errorFetchingContacts}</p>
          <p>Please check the server logs for more details or try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* 
        The header structure (AppBrandHeader and HeaderActionButtons) 
        is now expected to be handled within MediaContactsClientView 
        or a component it renders.
      */}
      <Suspense fallback={<HomePageSkeleton />}>
        <MediaContactsClientView initialContacts={initialMediaContacts} totalContactsCount={0} />
      </Suspense>
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

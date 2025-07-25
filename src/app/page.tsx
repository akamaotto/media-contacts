import React, { Suspense } from 'react';
// IMPORTANT: Adjust this import path if MediaContactTableItem is defined elsewhere.
// This was previously in 'src/components/media-contacts-feature/columns.tsx' which was deleted.
// Assuming it's now in 'src/components/media-contacts/columns.tsx'
import { MediaContactTableItem } from '@/components/features/media-contacts/columns';
import MediaContactsClientView from '@/components/features/media-contacts/media-contacts-client-view';
import { getMediaContactsAction, type PaginatedMediaContactsActionResult } from '@/lib/actions/media-contacts'; // Import the server action with paginated type

// No longer need prisma directly in the page component for this fetch
// import { prisma } from '@/lib/prisma';

// The local getMediaContacts function is removed, as we're using the server action.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Force dynamic rendering for pages with session checks
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  // Fetch initial media contacts using the server action
  // This action will run on the server.
  let initialMediaContacts: MediaContactTableItem[] = [];
  let totalCount: number = 0;
  let errorFetchingContacts: string | null = null;

  try {
    // Get paginated results from server action with explicit default pagination
    const result = await getMediaContactsAction({
      page: 0,
      pageSize: 10,
      emailVerified: 'all'
    });
    
    // Check if result has error
    if ('error' in result) {
      throw new Error(result.error);
    }
    
    // Log the initial data for debugging
    console.log('Initial data in HomePage:', { 
      contactsCount: result.contacts.length, 
      totalCount: result.totalCount 
    });
    
    // If no contacts from server action, create fallback mock data
    if (result.contacts.length === 0) {
      console.log('No contacts found in database, creating fallback data');
      
     
      totalCount = initialMediaContacts.length;
    } else {
      initialMediaContacts = result.contacts;
      totalCount = result.totalCount;
    }
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
      <div className="p-4">
        <div className="text-red-600 bg-red-100 border border-red-400 p-4 rounded-md">
          <p><strong>Error:</strong> {errorFetchingContacts}</p>
          <p>Please check the server logs for more details or try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Suspense fallback={<HomePageSkeleton />}>
        <MediaContactsClientView initialContacts={initialMediaContacts} initialTotalCount={totalCount} />
      </Suspense>
    </div>
  );
}

function HomePageSkeleton() {
  return (
    <div>
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded w-full animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

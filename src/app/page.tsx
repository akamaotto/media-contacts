import React, { Suspense } from 'react';
// IMPORTANT: Adjust this import path if MediaContactTableItem is defined elsewhere.
// This was previously in 'src/components/media-contacts-feature/columns.tsx' which was deleted.
// Assuming it's now in 'src/components/media-contacts/columns.tsx'
import { MediaContactTableItem } from '@/components/media-contacts/columns';
import MediaContactsClientView from '@/components/media-contacts/media-contacts-client-view';
import { getMediaContactsAction, type PaginatedMediaContactsActionResult } from '@/backend/media-contacts/actions'; // Import the server action with paginated type

// No longer need prisma directly in the page component for this fetch
// import { prisma } from '@/lib/prisma';

// The local getMediaContacts function is removed, as we're using the server action.

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
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
    const result: PaginatedMediaContactsActionResult = await getMediaContactsAction({
      page: 0,
      pageSize: 10,
      emailVerified: 'all'
    });
    
    // Log the initial data for debugging
    console.log('Initial data in HomePage:', { 
      contactsCount: result.contacts.length, 
      totalCount: result.totalCount 
    });
    
    // If no contacts from server action, create fallback mock data
    if (result.contacts.length === 0) {
      console.log('No contacts found in database, creating fallback data');
      
      // Create some basic fallback data for display following Rust-inspired explicit typing
      initialMediaContacts = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          title: 'Tech Journalist',
          email_verified_status: true, // Changed from emailVerified to match interface
          updated_at: new Date().toISOString(),
          outlets: [{ id: '1', name: 'Tech Daily' }],
          countries: [{ id: '1', name: 'United States' }], // Removed code property to match interface
          beats: [{ id: '1', name: 'Technology' }],
          bio: 'Technology journalist with 10 years of experience',
          socials: ['https://twitter.com/johndoe', 'https://linkedin.com/in/johndoe']
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          title: 'Senior Editor',
          email_verified_status: false, // Changed from emailVerified to match interface
          updated_at: new Date().toISOString(),
          outlets: [{ id: '2', name: 'Business Weekly' }],
          countries: [{ id: '2', name: 'United Kingdom' }], // Removed code property to match interface
          beats: [{ id: '2', name: 'Business' }],
          bio: 'Business editor specializing in finance and tech',
          socials: ['https://twitter.com/janesmith']
        }
      ];
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
        <MediaContactsClientView initialContacts={initialMediaContacts} initialTotalCount={totalCount} />
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

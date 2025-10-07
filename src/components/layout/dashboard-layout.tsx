"use client"

import React, { useState, useEffect } from 'react'
import { MediaContactsSidebar } from '@/components/layout/media-contacts-sidebar'
import { UpdateMediaContactSheet } from '@/components/features/media-contacts/update-media-contact-sheet'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import { UserPlus, Plus } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const pathname = usePathname()

  // Listen for custom add contact event from sidebar
  useEffect(() => {
    const handleOpenAddContact = () => {
      setIsAddContactOpen(true)
    }

    window.addEventListener('open-add-contact', handleOpenAddContact)
    return () => {
      window.removeEventListener('open-add-contact', handleOpenAddContact)
    }
  }, [])

  // Handle Add User action for Users page
  const handleAddUser = () => {
    const userTableRef = (window as any).__userTableRef;
    if (userTableRef?.current) {
      userTableRef.current.openAddUserDialog();
    } else {
      console.warn('UserTable ref not available');
    }
  };

  // Handle Add Country action for Countries page
  const handleAddCountry = () => {
    const countriesTableRef = (window as any).__countriesTableRef;
    if (countriesTableRef?.current) {
      countriesTableRef.current.openAddCountryModal();
    } else {
      console.warn('CountriesTable ref not available');
    }
  };

  // Handle Add Language action for Languages page
  const handleAddLanguage = () => {
    const languagesTableRef = (window as any).__languagesTableRef;
    if (languagesTableRef?.current) {
      languagesTableRef.current.openAddLanguageModal();
    } else {
      console.warn('LanguagesTable ref not available');
    }
  };

  // Handle Add Region action for Regions page
  const handleAddRegion = () => {
    if (typeof window !== 'undefined' && (window as any).openAddRegionSheet) {
      (window as any).openAddRegionSheet();
    } else {
      console.warn('openAddRegionSheet function not available');
    }
  };

  // Handle Add Beat action for Beats page
  const handleAddBeat = () => {
    if (typeof window !== 'undefined' && (window as any).openAddBeatModal) {
      (window as any).openAddBeatModal();
    } else {
      console.warn('openAddBeatModal function not available');
    }
  };

  // Handle Add Category action for Categories page
  const handleAddCategory = () => {
    if (typeof window !== 'undefined' && (window as any).openAddCategoryModal) {
      (window as any).openAddCategoryModal();
    } else {
      console.warn('openAddCategoryModal function not available');
    }
  };

  // Handle Add Publisher action for Publishers page
  const handleAddPublisher = () => {
    if (typeof window !== 'undefined' && (window as any).openAddPublisherModal) {
      (window as any).openAddPublisherModal();
    } else {
      console.warn('openAddPublisherModal function not available');
    }
  };

  // Handle Add Outlet action for Outlets page
  const handleAddOutlet = () => {
    if (typeof window !== 'undefined' && (window as any).openAddOutletModal) {
      (window as any).openAddOutletModal();
    } else {
      console.warn('openAddOutletModal function not available');
    }
  };

  // Generate breadcrumb title based on current path
  const getBreadcrumbTitle = () => {
    if (pathname === '/') {
      return 'Dashboard'
    } else if (pathname === '/profile') {
      return 'Profile'
    } else if (pathname === '/publishers') {
      return 'Publishers'
    } else if (pathname === '/outlets') {
      return 'Media Outlets'
    } else if (pathname === '/beats') {
      return 'Beats'
    } else if (pathname === '/categories') {
      return 'Categories'
    } else if (pathname === '/countries') {
      return 'Countries'
    } else if (pathname === '/languages') {
      return 'Languages'
    } else if (pathname === '/regions') {
      return 'Regions'
    } else if (pathname === '/admin/users') {
      return 'Admin'
    } else if (pathname === '/media-contacts') {
      return 'Media Contacts'
    } else {
      return 'Dashboard'
    }
  }

  const breadcrumbTitle = getBreadcrumbTitle()

  return (
    <SidebarProvider>
      <MediaContactsSidebar />
      <SidebarInset>
        {/* Header with breadcrumb */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumbTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-4 p-8">
          {/* Main content */}
          <div>
            {children}
          </div>
        </div>
      </SidebarInset>

      {/* Add Contact Sheet */}
      {isAddContactOpen && (
        <UpdateMediaContactSheet
          isOpen={isAddContactOpen}
          onOpenChange={setIsAddContactOpen}
          contact={null} // null means we're adding a new contact
          onSuccess={() => {
            setIsAddContactOpen(false)
            // Refresh data is handled by individual pages
          }}
        />
      )}
    </SidebarProvider>
  )
}

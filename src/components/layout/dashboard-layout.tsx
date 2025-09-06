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
import { DashboardLayoutTitle } from './dashboard-layout-title'
import { BreadcrumbButtons } from './breadcrumb-buttons'
import { getDefaultButtons } from './dashboard-button-configs'

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

  // Generate breadcrumb and buttons based on current path
  const getBreadcrumb = () => {
    if (pathname === '/') {
      return { 
        title: 'Dashboard', 
        subtitle: 'Analytics and insights for your media contacts',
        buttons: []
      }
    } else if (pathname === '/profile') {
      return { 
        title: 'Profile', 
        subtitle: 'Manage your account settings',
        buttons: getDefaultButtons()
      }
    } else if (pathname === '/publishers') {
      return { 
        title: 'Publishers', 
        subtitle: 'Manage media publishers and their outlets',
        buttons: [{
          label: "Add Publisher",
          onClick: handleAddPublisher,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/outlets') {
      return { 
        title: 'Outlets', 
        subtitle: 'Manage media outlets and their categories',
        buttons: [{
          label: "Add Outlet",
          onClick: handleAddOutlet,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/beats') {
      return { 
        title: 'Beats', 
        subtitle: 'Manage and organize journalist beats',
        buttons: [{
          label: "Add Beat",
          onClick: handleAddBeat,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/categories') {
      return { 
        title: 'Categories', 
        subtitle: 'Organize beats and outlets by editorial themes',
        buttons: [{
          label: "Add Category",
          onClick: handleAddCategory,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/countries') {
      return { 
        title: 'Countries', 
        subtitle: 'Manage and organize countries',
        buttons: [{
          label: "Add Country",
          onClick: handleAddCountry,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/languages') {
      return { 
        title: 'Languages', 
        subtitle: 'Manage and organize languages',
        buttons: [{
          label: "Add Language",
          onClick: handleAddLanguage,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/regions') {
      return { 
        title: 'Regions', 
        subtitle: 'Manage and organize regions',
        buttons: [{
          label: "Add Region",
          onClick: handleAddRegion,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/publishers') {
      return { 
        title: 'Publishers', 
        subtitle: 'Manage media publishers and their outlets',
        buttons: [{
          label: "Add Publisher",
          onClick: handleAddPublisher,
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/admin/users') {
      return { 
        title: 'Admin', 
        subtitle: 'User Management',
        buttons: [{
          label: "Add User",
          onClick: handleAddUser,
          variant: "default" as const,
          icon: <UserPlus className="h-4 w-4" />
        }]
      }
    } else if (pathname === '/media-contacts') {
      return { 
        title: 'Media Contacts', 
        subtitle: 'Manage your media contacts, search by criteria, and organize your media database',
        buttons: [{
          label: "Add Contact",
          onClick: () => setIsAddContactOpen(true),
          variant: "default" as const,
          icon: <Plus className="h-4 w-4" />
        }]
      }
    } else {
      return { 
        title: 'Dashboard', 
        subtitle: 'Analytics and insights for your media contacts',
        buttons: []
      }
    }
  }

  const breadcrumb = getBreadcrumb()

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
                  <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* Only show DashboardLayoutTitle for non-dashboard pages */}
          {pathname !== '/' && (
            <DashboardLayoutTitle 
              title={breadcrumb.title}
              subtitle={breadcrumb.subtitle}
              buttons={breadcrumb.buttons}
            />
          )}
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

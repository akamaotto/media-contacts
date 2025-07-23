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
import { UserPlus } from 'lucide-react'
import { DashboardLayoutTitle } from './dashboard-layout-title'
import { getHomePageButtons, getUsersPageButtons, getDefaultButtons } from './dashboard-button-configs'

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

  // Generate breadcrumb and buttons based on current path
  const getBreadcrumb = () => {
    if (pathname === '/') {
      return { 
        title: 'Home', 
        subtitle: 'Media Contacts Overview',
        buttons: getHomePageButtons(() => setIsAddContactOpen(true))
      }
    } else if (pathname === '/profile') {
      return { 
        title: 'Profile', 
        subtitle: 'Manage your account settings',
        buttons: getDefaultButtons()
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
    } else {
      return { 
        title: 'Media Contacts', 
        subtitle: 'Manage your media contacts database',
        buttons: getDefaultButtons()
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
          <DashboardLayoutTitle 
            title={breadcrumb.title}
            subtitle={breadcrumb.subtitle}
            buttons={breadcrumb.buttons}
          />
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
          onContactUpdate={() => {
            setIsAddContactOpen(false)
            // Refresh data is handled by individual pages
          }}
        />
      )}
    </SidebarProvider>
  )
}

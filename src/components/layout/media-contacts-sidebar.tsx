"use client"

import * as React from "react"
import {
  IconUsers,
  IconUserPlus,
  IconSettings,
  IconHelp,
  IconSearch,
  IconDatabase,
  IconReport,
  IconDashboard,
  IconUserCog,
  IconLogout,
} from "@tabler/icons-react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function MediaContactsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // Navigation configuration for media contacts app
  const navigationData = {
    user: {
      name: session?.user?.name || "User",
      email: session?.user?.email || "user@example.com",
      avatar: session?.user?.image || "/avatars/default.jpg",
    },
    navMain: [
      {
        title: "Home",
        url: "/",
        icon: IconDashboard,
        isActive: pathname === "/"
      },
      {
        title: "Users",
        url: "/admin/users",
        icon: IconUsers,
        isActive: pathname === "/admin/users"
      }
    ],
    navSecondary: [] as Array<{
      title: string
      url: string
      icon: any
      isActive: boolean
    }>
  }

  const handleNavigation = (url: string) => {
    if (url === "#add-contact") {
      // Trigger add contact modal - we'll implement this via a custom event
      window.dispatchEvent(new CustomEvent('open-add-contact'))
    } else if (url === "#help") {
      // Handle help action
      console.log("Help clicked")
    } else if (url.startsWith("/")) {
      router.push(url)
    }
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/" className="flex items-center gap-2">
                <IconDatabase className="!size-5" />
                <span className="text-base font-semibold">Media Contacts</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain 
          items={navigationData.navMain} 
        />
        
        {navigationData.navSecondary.length > 0 && (
          <NavSecondary 
            items={navigationData.navSecondary.map(item => ({
              ...item,
              onClick: () => handleNavigation(item.url)
            }))} 
            className="mt-auto" 
          />
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser 
          user={navigationData.user}
          onSignOut={handleSignOut}
        />
      </SidebarFooter>
    </Sidebar>
  )
}

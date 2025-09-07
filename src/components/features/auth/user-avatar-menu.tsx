"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PATHS } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Users, Home } from "lucide-react";
import Link from "next/link";

export function UserAvatarMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  // Check for both ADMIN and admin (case insensitive)
  const isAdmin = session?.user && 
    (session.user.role === "ADMIN" || 
     session.user.role === "admin");
  
  // Get initials from name or email
  const getInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return session?.user?.email?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link 
            href={PATHS.DASHBOARD_PROFILE}
            onClick={(e) => {
              e.preventDefault();
              router.push(PATHS.DASHBOARD_PROFILE);
            }} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link 
              href={PATHS.DASHBOARD_ADMIN_USERS}
              onClick={(e) => {
                e.preventDefault();
                router.push(PATHS.DASHBOARD_ADMIN_USERS);
              }} 
              className="flex items-center gap-2 cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>Users</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={async () => await signOut({ callbackUrl: PATHS.LOGIN })}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

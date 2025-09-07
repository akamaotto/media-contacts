"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { 
  User, 
  Mail, 
  Calendar,
  Shield,
  Edit,
  X
} from "lucide-react";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDetail | null;
  onEdit?: (user: UserDetail) => void;
}

export function UserDetailSheet({
  isOpen,
  onOpenChange,
  user,
  onEdit,
}: UserDetailSheetProps) {
  if (!user) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      
      <SheetContent className="w-[480px] sm:w-[520px] p-0">
        {/* Accessibility: Required SheetTitle for screen readers */}
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>User Details: {user.name || user.email}</SheetTitle>
            <SheetDescription>
              View detailed information about the user {user.name || user.email}.
            </SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        
        {/* Header with proper Swedish design spacing */}
        <div className="px-6 py-5 border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-3">
              <h1 className="text-xl font-medium text-foreground leading-tight">
                {user.name || user.email}
              </h1>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${getRoleBadgeVariant(user.role)} text-xs font-medium px-2 py-1 flex items-center gap-1.5`}
                >
                  <Shield className="h-3 w-3" />
                  {user.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit?.(user)}
              className="h-8 px-3 text-sm mr-6 font-medium hover:bg-muted/50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed flex items-center gap-1">
            <Mail className="h-4 w-4" />
            {user.email}
          </p>
        </div>

        {/* Content sections with Swedish design spacing */}
        <div className="px-6 py-5 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Basic Information
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User ID</span>
                <p className="font-mono text-sm text-foreground">{user.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                <p className="text-sm text-foreground break-all">{user.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</span>
                <p className="text-sm text-foreground">{user.name || "-"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</span>
                <Badge 
                  variant="outline" 
                  className={`${getRoleBadgeVariant(user.role)} text-xs font-medium px-2 py-1`}
                >
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Account Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Account Information
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{formatDate(user.createdAt)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{formatDate(user.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
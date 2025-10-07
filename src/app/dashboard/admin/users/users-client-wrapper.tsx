"use client";

import React, { useRef } from "react";
import UserTable, { type UserTableRef } from "./user-table";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UsersClientWrapperProps {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }>;
}

export default function UsersClientWrapper({ users }: UsersClientWrapperProps) {
  const userTableRef = useRef<UserTableRef>(null);

  // Store the ref globally so the dashboard layout can access it
  React.useEffect(() => {
    (window as unknown as { __userTableRef: React.RefObject<UserTableRef | null> }).__userTableRef = userTableRef;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage user accounts and permissions for the media contacts system
          </p>
        </div>
        <Button onClick={() => userTableRef.current?.openAddUserDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>
      <UserTable ref={userTableRef} users={users} />
    </div>
  );
}

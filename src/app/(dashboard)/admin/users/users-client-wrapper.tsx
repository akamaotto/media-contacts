"use client";

import React, { useRef } from "react";
import UserTable, { type UserTableRef } from "./user-table";

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
    <div className="container mx-auto px-4">
      <UserTable ref={userTableRef} users={users} />
    </div>
  );
}

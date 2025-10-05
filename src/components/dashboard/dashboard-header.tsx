'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PATHS } from "@/lib/constants";
import type { Session } from "next-auth";

interface DashboardHeaderProps {
  session: Session;
}

export function DashboardHeader({ session }: DashboardHeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAddContact = () => {
    setIsLoading(true);
    router.push(PATHS.DASHBOARD_MEDIA_CONTACTS);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session.user?.name || session.user?.email}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={handleAddContact} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>
    </div>
  );
}
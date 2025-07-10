"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4 mb-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <Home className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <UserAvatarMenu />
    </div>
  );
}

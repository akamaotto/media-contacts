"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface SessionWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side session wrapper to handle hydration mismatches in production
 * Ensures proper session state synchronization between server and client
 */
export function SessionWrapper({ children, fallback }: SessionWrapperProps) {
  const { data: session, status } = useSession();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after client-side mount to prevent hydration mismatches
    setIsHydrated(true);
  }, []);

  // Show loading state during hydration to prevent layout shift
  if (!isHydrated || status === "loading") {
    return fallback || <div>Loading...</div>;
  }

  // Only render children after proper hydration and session resolution
  return <>{children}</>;
}

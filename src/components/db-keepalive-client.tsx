'use client';

import { useEffect } from 'react';
import { startDbKeepAlive, stopDbKeepAlive } from '@/lib/db-keepalive';

/**
 * Client component that initializes the database keep-alive mechanism
 * This component should be included in the root layout
 */
export function DbKeepAliveClient() {
  useEffect(() => {
    // Start the keep-alive mechanism when the component mounts
    startDbKeepAlive();
    
    // Clean up by stopping the keep-alive mechanism when the component unmounts
    return () => {
      stopDbKeepAlive();
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}

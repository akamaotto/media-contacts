"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the form wrapper
// This is now in a client component, which is allowed
const ProfileFormWrapper = dynamic(() => import("./profile-form-wrapper"), {
  ssr: false,
});

export default function ProfileFormClient() {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-3xl px-4 py-10 mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-md border shadow-sm w-full p-6">
          <ProfileFormWrapper />
        </div>
      </div>
    </div>
  );
}

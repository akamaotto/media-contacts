"use client";

import { Suspense } from "react";
import ProfileForm from "./profile-form";

export default function ProfileFormWrapper() {
  return (
    <Suspense fallback={<div>Loading profile form...</div>}>
      <ProfileForm />
    </Suspense>
  );
}

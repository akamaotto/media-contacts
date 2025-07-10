import { Suspense } from "react";
import LoginClient from "./login-client";

// Default export for the page
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <LoginClient />
    </Suspense>
  );
}


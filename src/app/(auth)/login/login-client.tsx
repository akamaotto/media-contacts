"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/sonner";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();
  
  // State for callback URL to handle SSR properly
  const [callbackUrl, setCallbackUrl] = useState("/");
  
  // Handle search params safely on client side only
  useEffect(() => {
    if (params) {
      const url = params.get("callbackUrl") || "/";
      setCallbackUrl(url);
    }
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  
  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session) {
      // If we have a pending redirect, execute it
      if (pendingRedirect && redirectUrl) {
        router.push(redirectUrl);
      } else if (status === "authenticated") {
        // Otherwise, just go to the homepage if already logged in
        router.push("/");
      }
    }
  }, [status, session, pendingRedirect, redirectUrl, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      // Instead of immediate redirect, set pending redirect
      // and wait for session to be available
      toast.success("Login successful! Redirecting...");
      setPendingRedirect(true);
      setRedirectUrl(res?.url || "/");
      
      // Keep loading state active until redirect happens
      // Loading state will be cleared by the router navigation
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Toaster />
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 bg-white dark:bg-zinc-900 p-6 rounded shadow"
      >
        <h1 className="text-2xl font-semibold text-center">Login</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.318.254-2.577.725-3.732M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c.991 0 1.95.164 2.852.465M19.545 15.582A9.966 9.966 0 0021.542 12c-.275-.845-.676-1.654-1.18-2.402M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.94 17.94A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-2.021.627-3.897 1.69-5.445M9.879 9.879A3 3 0 0112 9c1.657 0 3 1.343 3 3 0 .414-.083.808-.234 1.172"/></svg>
              )}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}

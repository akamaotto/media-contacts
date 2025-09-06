// Re-export the auth helper from NextAuth 5 configuration with explicit typing,
// but avoid static import of `next-auth` in Jest to prevent ESM parsing issues.
import type { Session } from "next-auth";

export async function auth(): Promise<Session | null> {
  // In Jest tests, callers mock this function. Return a benign default
  // to avoid importing next-auth ESM during test discovery.
  if (process.env.JEST_WORKER_ID) {
    return null;
  }
  const mod = await import("../../auth");
  return (mod as unknown as { auth: () => Promise<Session | null> }).auth();
}

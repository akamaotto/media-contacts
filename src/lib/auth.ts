// Re-export the auth helper from NextAuth route so that
// server components can do `const session = await auth()`
// without importing from the route file path.

export { auth } from "@/app/api/auth/[...nextauth]/route";

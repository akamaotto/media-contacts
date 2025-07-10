import NextAuth from "next-auth";

import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * NextAuth configuration – Credentials provider (email / password)
 * The Prisma adapter persists sessions & accounts to the DB.
 */
import type { AuthOptions, SessionStrategy } from "next-auth";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.hashedPassword) return null;
        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, persist role to token
      if (user && "role" in user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      // Expose role to client/session
      (session.user as any).role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  // callbacks example (optional): attach id to session
  
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const auth = handler;

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Temporarily disable Prisma adapter to isolate session persistence issue
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  // Fix for Vercel production deployment
  basePath: "/api/auth",
  // Critical fix for production session persistence
  useSecureCookies: process.env.NODE_ENV === "production",
  // Ensure proper domain handling in production
  ...(process.env.NODE_ENV === "production" && {
    url: process.env.AUTH_URL || "https://media-contacts.vercel.app",
  }),
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Enhanced production session persistence
        ...(process.env.NODE_ENV === "production" && {
          domain: ".vercel.app",
          maxAge: 30 * 24 * 60 * 60, // 30 days
        }),
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV === "production" && {
          domain: ".vercel.app",
        }),
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV === "production" && {
          domain: ".vercel.app",
        }),
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[NextAuth] Authorize called with:", {
          email: credentials?.email,
          hasPassword: !!credentials?.password,
        })
        
        if (!credentials?.email || !credentials.password) {
          console.log("[NextAuth] Missing credentials")
          return null
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })
          
          if (!user) {
            console.log("[NextAuth] User not found:", credentials.email)
            return null
          }
          
          if (!user.hashedPassword) {
            console.log("[NextAuth] User has no password:", credentials.email)
            return null
          }
          
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.hashedPassword
          )
          
          if (!isValid) {
            console.log("[NextAuth] Invalid password for:", credentials.email)
            return null
          }
          
          console.log("[NextAuth] Authentication successful for:", credentials.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("[NextAuth] Authorization error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      console.log("[NextAuth] Session callback:", {
        hasToken: !!token,
        tokenSub: token.sub,
        tokenRole: token.role,
      })
      
      if (token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as string
      }
      
      console.log("[NextAuth] Session created:", {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role,
      })
      
      return session
    },
    jwt({ token, user, trigger }) {
      console.log("[NextAuth] JWT callback:", {
        trigger,
        hasUser: !!user,
        hasToken: !!token,
        userRole: user && 'role' in user ? user.role : undefined,
      })
      
      if (user && 'role' in user) {
        token.role = user.role as string
        console.log("[NextAuth] JWT token updated with role:", user.role)
      }
      
      return token
    },
    signIn({ user, account, profile }) {
      console.log("[NextAuth] SignIn callback:", {
        userId: user.id,
        userEmail: user.email,
        provider: account?.provider,
      })
      return true
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
})

import { withAuth } from "next-auth/middleware";

// Use default NextAuth authorization check
export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;
      if (pathname.startsWith('/register') || pathname.startsWith('/admin')) {
        return token?.role === 'ADMIN';
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/",
    "/((?!api|_next|login|register).*)",
  ],
};

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Fix for Vercel deployment issue with Next.js 15
  serverExternalPackages: ['@prisma/client'],
  // Removed standalone output mode due to Vercel compatibility issues
  // Disable image optimization to avoid issues
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
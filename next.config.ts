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
  // Transpile packages for better compatibility (excluding Prisma)
  transpilePackages: [],
  // External packages configuration for Prisma
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Experimental features to fix client reference manifest issues
  experimental: {
    // Fix for missing client reference manifest
    optimizePackageImports: [],
  },
  // Disable image optimization to avoid issues
  images: {
    unoptimized: true,
  },
  // Ensure proper webpack configuration for Vercel
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Fix for Prisma query engine in Vercel
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': '@prisma/client',
      });
    }

    return config;
  },
};

export default nextConfig;
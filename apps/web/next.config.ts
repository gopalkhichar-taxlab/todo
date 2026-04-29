import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Treat the shared schemas package as part of the app bundle.
  transpilePackages: ['@kudo/schemas'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

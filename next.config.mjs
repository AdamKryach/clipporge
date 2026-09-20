/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
  images: {
    domains: [],
  },
  webpack: (config) => {
    config.externals.push({
      "@prisma/client": "commonjs @prisma/client",
    });
    return config;
  },
};

export default nextConfig;
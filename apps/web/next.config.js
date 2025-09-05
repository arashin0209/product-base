/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@product-base/ui", "@product-base/shared-utils"],
  images: {
    domains: [],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
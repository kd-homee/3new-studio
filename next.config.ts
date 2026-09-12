import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for the XServer VPS container.
  output: 'standalone',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable strict mode
  reactStrictMode: true,

  // Configure remote patterns for images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avnz-platform-assets.s3.us-east-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avnz-platform-assets.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        // Platform's CloudFront distribution - use specific domain instead of wildcard
        // for better security (prevents loading images from arbitrary CloudFront distributions)
        protocol: 'https',
        hostname: 'd1b5qvkfx8n6cj.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.roastify.app',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig

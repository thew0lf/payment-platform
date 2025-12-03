/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime for optimal performance at scale
  experimental: {
    // Partial prerendering for dynamic segments
  },

  // Cache pages for better performance
  // Pages are revalidated based on funnel updates
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=600',
        },
      ],
    },
  ],

  // Optimize images from S3/Cloudinary
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;

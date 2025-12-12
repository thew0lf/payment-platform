/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      // Redirect apex domain to founders subdomain
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'avnz.io',
          },
        ],
        destination: 'https://founders.avnz.io/:path*',
        permanent: false, // Use 307 for now, switch to true (301) after launch
      },
      // Redirect www to founders subdomain
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.avnz.io',
          },
        ],
        destination: 'https://founders.avnz.io/:path*',
        permanent: false, // Use 307 for now, switch to true (301) after launch
      },
    ];
  },
};

module.exports = nextConfig;

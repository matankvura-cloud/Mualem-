import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@neondatabase/serverless', '@electric-sql/pglite'],
  // pglite טוען wasm מהדיסק; בסביבת ניסיון (KUPA_LOCAL_DB=memory) הקבצים חייבים להיכלל בפונקציה.
  outputFileTracingIncludes: { '/**': ['./node_modules/@electric-sql/pglite/dist/**', './db/schema.sql'] },
  async headers() {
    return [
      {
        source: '/widget.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

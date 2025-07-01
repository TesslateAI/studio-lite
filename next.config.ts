import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        stream: false,
        crypto: false,
        net: false,
        tls: false,
        fs: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        os: false,
        url: false
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://connect.facebook.net https://www.googletagmanager.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://api.openai.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.googleapis.com http://localhost:4000 http://localhost:* https://*.docker.internal wss: ws://localhost:*; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; worker-src 'self' blob:;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;

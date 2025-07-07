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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://connect.facebook.net https://www.googletagmanager.com https://apis.google.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://designer.tesslate.com https://apps.tesslate.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://designer.tesslate.com https://apps.tesslate.com; font-src 'self' https://fonts.gstatic.com data: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://designer.tesslate.com https://apps.tesslate.com; img-src 'self' data: https: blob: https://designer.tesslate.com https://apps.tesslate.com; connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://api.openai.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com https://*.googleapis.com http://localhost:4000 http://localhost:* https://*.docker.internal wss: ws://localhost:* https://static.cloudflareinsights.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://designer.tesslate.com https://apps.tesslate.com; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.firebaseapp.com https://*.codesandbox.io https://*.sandpack-static-server.codesandbox.io https://codesandbox.io https://sandpack.codesandbox.io https://designer.tesslate.com https://apps.tesslate.com; object-src 'none'; base-uri 'self'; worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;

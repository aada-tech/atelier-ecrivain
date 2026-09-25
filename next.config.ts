import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Domaines Firebase autorisés dans la CSP. Le domaine d'authentification peut
 * être personnalisé (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN), on l'ajoute donc
 * explicitement aux sources de frames.
 */
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const emulators = process.env.NEXT_PUBLIC_USE_EMULATORS === '1' ? ' http://127.0.0.1:9099 http://127.0.0.1:8080 ws://127.0.0.1:*' : '';

const csp = [
  `default-src 'self'`,
  // Next.js injecte des scripts inline d'hydratation : 'unsafe-inline' reste
  // nécessaire sans nonce. Aucun 'unsafe-eval' en production.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com https://firebasestorage.googleapis.com`,
  `font-src 'self' data:`,
  `media-src 'self' blob: data:`,
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}${emulators}`,
  `frame-src 'self' https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com${authDomain ? ` https://${authDomain}` : ''}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  isDev || emulators ? '' : 'upgrade-insecure-requests',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Le micro n'est autorisé que pour notre propre origine (dictée).
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=(), browsing-topics=()',
  },
  // Requis par signInWithPopup (Firebase Auth) tout en isolant la fenêtre.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // Les réponses de l'API IA contiennent du texte de manuscrit : jamais en cache.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
  async redirects() {
    return [{ source: '/app', destination: '/bibliotheque', permanent: false }];
  },
};

export default nextConfig;

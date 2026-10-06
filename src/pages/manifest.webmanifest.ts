import type { APIRoute } from 'astro';
import { sitePath } from '../lib/paths';

export const GET: APIRoute = () => new Response(JSON.stringify({
  id: sitePath('/'),
  name: 'CD Menciana Apaga y Vámonos',
  short_name: 'CD Menciana',
  lang: 'es',
  start_url: sitePath('/'),
  scope: sitePath('/'),
  display: 'standalone',
  background_color: '#0D2E5B',
  theme_color: '#0D2E5B',
  icons: [
    { src: sitePath('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: sitePath('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: sitePath('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });

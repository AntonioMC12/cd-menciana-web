import type { APIRoute } from 'astro';
export const prerender = false;
export const GET: APIRoute = async ({ site }) => new Response(`User-agent: *\nDisallow: /admin/\nDisallow: /api/admin/\nSitemap: ${new URL('/sitemap-index.xml', site).href}\nSitemap: ${new URL('/sitemap-content.xml', site).href}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

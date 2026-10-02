import type { APIRoute } from 'astro';
import { sitePath } from '../lib/paths';
export const GET: APIRoute = async ({ site }) => new Response(`User-agent: *\nSitemap: ${new URL(sitePath('/sitemap-index.xml'), site).href}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });

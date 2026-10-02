import type { APIRoute } from 'astro';
import { publishedList } from '../lib/cms';
export const prerender = false;
export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin;
  if (!origin) return new Response('Falta PUBLIC_SITE_URL', { status: 503 });
  const collect = async (table: 'posts' | 'albums') => { const all = []; for (let page = 1; page <= 100; page++) { const rows = await publishedList(table, page, 100); all.push(...rows); if (rows.length < 100) break; } return all; };
  const posts = await collect('posts');
  const albums = await collect('albums');
  const escape = (x: string) => x.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const urls = [...posts.map(x => `/noticias/${x.published_slug}/`), ...albums.map(x => `/galerias/${x.published_slug}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } });
};

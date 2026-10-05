import { bindings, csrfToken, error, identity, json, parseBody, photosForAlbum, publishedBySlug, publishedList, type Content, type Row } from '../src/lib/cms';
import { GET as publicMedia } from './media/[id]/[size]';
import { GET as privateMedia } from './private-media/[id]/[size]';
import * as collection from './api/admin/[kind]/index';
import * as item from './api/admin/[kind]/[id]';
import * as publish from './api/admin/[kind]/[id]/publish';
import * as unpublish from './api/admin/[kind]/[id]/unpublish';
import * as upload from './api/admin/albums/[id]/photos';
import * as photo from './api/admin/photos/[id]';
import * as options from './api/admin/photo-options';
import * as cleanup from './api/admin/cleanup';
import adminHtml from './admin.html.txt';
import adminCss from './admin.css.txt';
import adminJs from './admin-client.txt';
import { getSportsSnapshot, syncSports } from './sports';
import { competitiveTeamIds, teamCompetitions, type CompetitiveTeamId } from '../src/data/team-competitions';

const html = (value: string, status = 200) => new Response(value, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const page = (title: string, body: string) => html(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(title)} | CD Menciana</title><link rel="stylesheet" href="/admin/style.css"><main class="admin-shell">${body}</main></html>`);
const article = (row: Row) => {
  const content = JSON.parse(row.published_json || '{}') as Content;
  return { id: row.id, slug: row.published_slug, title: content.title, excerpt: content.excerpt, body: parseBody(content.body), category: content.category, coverPhotoId: content.coverPhotoId, publishedAt: row.published_at?.slice(0, 10) };
};
const album = (row: Row) => {
  const content = JSON.parse(row.published_json || '{}') as Content;
  return { id: row.id, slug: row.published_slug, title: content.title, description: content.description || content.excerpt, coverPhotoId: content.coverPhotoId, publishedAt: row.published_at?.slice(0, 10) };
};
const cors = (response: Response, request: Request): Response => {
  const origin = request.headers.get('origin');
  if (origin && origin === bindings().PUBLIC_WEB_ORIGIN) {
    const headers = new Headers(response.headers);
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-methods', 'GET, OPTIONS');
    headers.set('access-control-allow-headers', 'Content-Type');
    headers.set('vary', 'Origin');
    return new Response(response.body, { status: response.status, headers });
  }
  return response;
};
const responseFor = async (module: Record<string, unknown>, method: string, request: Request, params: Record<string, string>): Promise<Response> => {
  const handler = module[method];
  return typeof handler === 'function' ? (handler as (context: unknown) => Promise<Response>)({ request, params }) : error('Método no permitido.', 405);
};
const publicSite = () => {
  const origin = (bindings().PUBLIC_WEB_ORIGIN || 'https://cdmenciana.es').replace(/\/$/, '');
  const base = (bindings() as { PUBLIC_WEB_BASE?: string }).PUBLIC_WEB_BASE ?? '/';
  const path = base === '/' ? '' : `/${base.replace(/^\/+|\/+$/g, '')}`;
  return `${origin}${path}/`;
};

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method;
    const parts = path.split('/').filter(Boolean);
    try {
      if (path === '/') return Response.redirect(publicSite(), 302);
      if (path === '/admin' && method === 'GET') {
        const email = await identity(request);
        if (!email) return page('Acceso restringido', '<h1>Acceso restringido</h1><p>Inicia sesión mediante Cloudflare Access.</p>');
        return html(adminHtml.replace('__CSRF__', await csrfToken(email)).replace('__EMAIL__', escape(email)).replace('__PUBLIC_SITE__', escape(publicSite())));
      }
      if (path === '/admin/style.css' && method === 'GET') return new Response(adminCss, { headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
      if (path === '/admin/client.js' && method === 'GET') {
        if (!(await identity(request))) return error('No autorizado.', 401);
        return new Response(adminJs, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' } });
      }
      if (parts[0] === 'admin' && parts[1] === 'preview' && parts.length === 4 && method === 'GET') {
        const kind = parts[2];
        if (!(await identity(request)) || (kind !== 'posts' && kind !== 'albums')) return page('No disponible', '<h1>Previsualización no disponible</h1>');
        const row = await bindings().DB.prepare(`SELECT * FROM ${kind} WHERE id=?`).bind(parts[3]).first<Row>();
        if (!row) return page('No disponible', '<h1>Previsualización no disponible</h1>');
        const content = JSON.parse(row.draft_json) as Content;
        const cover = content.coverPhotoId ? `<img src="/admin/media/${encodeURIComponent(content.coverPhotoId)}/web" alt="Portada" style="max-width:100%">` : '';
        const detail = kind === 'posts' ? parseBody(content.body).map(p => `<p>${escape(p)}</p>`).join('') : (await photosForAlbum(row.id, false)).map(p => `<img src="/admin/media/${encodeURIComponent(p.id)}/thumb" alt="${escape(p.draft_alt)}" width="240">`).join('');
        return page(content.title, `<p>BORRADOR / PREVISUALIZACIÓN</p><h1>${escape(content.title)}</h1><p>${escape(content.excerpt)}</p>${cover}${detail}`);
      }
      if (parts[0] === 'admin' && parts[1] === 'media' && parts.length === 4 && method === 'GET') return privateMedia({ request, params: { id: parts[2], size: parts[3] } } as never);
      if (parts[0] === 'media' && parts.length === 3 && method === 'GET') return publicMedia({ request, params: { id: parts[1], size: parts[2] } } as never);
      if (parts[0] === 'api' && parts[1] === 'admin') {
        const params = { kind: parts[2], id: parts[3] };
        if (parts.length === 3 && (parts[2] === 'posts' || parts[2] === 'albums')) return responseFor(collection, method, request, params);
        if (parts.length === 4 && (parts[2] === 'posts' || parts[2] === 'albums')) return responseFor(item, method, request, params);
        if (parts.length === 5 && parts[4] === 'publish') return responseFor(publish, method, request, params);
        if (parts.length === 5 && parts[4] === 'unpublish') return responseFor(unpublish, method, request, params);
        if (parts.length === 5 && parts[2] === 'albums' && parts[4] === 'photos') return responseFor(upload, method, request, params);
        if (parts.length === 4 && parts[2] === 'photos') return responseFor(photo, method, request, { id: parts[3] });
        if (path === '/api/admin/photo-options') return responseFor(options, method, request, {});
        if (path === '/api/admin/cleanup') return responseFor(cleanup, method, request, {});
        return error('Ruta no válida.', 404);
      }
      if (parts[0] === 'api' && parts[1] === 'posts' && method === 'GET') {
        if (parts.length === 2) {
          const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
          const rows = await publishedList('posts', page, 10, 9);
          return cors(json({ items: rows.slice(0, 9).map(article), more: rows.length > 9 }), request);
        }
        if (parts.length === 3) {
          const row = await publishedBySlug('posts', parts[2]);
          return cors(row ? json(article(row)) : error('No encontrado.', 404), request);
        }
      }
      if (parts[0] === 'api' && parts[1] === 'albums' && method === 'GET') {
        if (parts.length === 2) {
          const page = Math.max(1, Math.min(10000, Number(url.searchParams.get('page')) || 1));
          const post = url.searchParams.get('post');
          const rows = post ? (await bindings().DB.prepare('SELECT * FROM albums WHERE post_id=? AND published_json IS NOT NULL ORDER BY published_at DESC LIMIT 10 OFFSET ?').bind(post, (page - 1) * 9).all<Row>()).results : await publishedList('albums', page, 10, 9);
          return cors(json({ items: rows.slice(0, 9).map(album), more: rows.length > 9 }), request);
        }
        if (parts.length === 3) {
          const row = await publishedBySlug('albums', parts[2]);
          const photos = row ? await photosForAlbum(row.id, true) : [];
          return cors(row ? json({ ...album(row), photos: photos.map(p => ({ id: p.id, alt: p.published_alt, width: p.width, height: p.height })) }) : error('No encontrado.', 404), request);
        }
      }
      if (path === '/api/sports' && method === 'GET') {
        const teamId = url.searchParams.get('team') || 'primer-equipo';
        if (!Object.hasOwn(teamCompetitions, teamId)) return cors(error('Equipo no encontrado.', 404), request);
        const snapshot = await getSportsSnapshot(teamId as CompetitiveTeamId) || await syncSports(teamId as CompetitiveTeamId);
        return cors(json(snapshot), request);
      }
      if (parts[0] === 'api' && method === 'OPTIONS' && (parts[1] === 'posts' || parts[1] === 'albums' || parts[1] === 'sports')) return cors(new Response(null, { status: 204 }), request);
      return error('No encontrado.', 404);
    } catch (cause) {
      console.error(cause);
      return error('Error interno.', 500);
    }
  },
  async scheduled(): Promise<void> {
    for (const teamId of competitiveTeamIds) {
      try { await syncSports(teamId); }
      catch (cause) { console.error(`No se pudo actualizar la competición RFAF de ${teamId}; se conserva la última copia.`, cause); }
    }
  },
};

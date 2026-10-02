import { env } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Bindings {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ENVIRONMENT?: string;
  LOCAL_ADMIN_BYPASS?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAIL?: string;
  CSRF_SECRET?: string;
}
export const bindings = () => env as unknown as Bindings;
export type Content = { title: string; excerpt: string; body: string; category: string; coverPhotoId: string | null; description?: string };
export type Row = { id: string; slug: string; published_slug: string | null; draft_json: string; published_json: string | null; version: number; published_version: number | null; created_at: string; updated_at: string; published_at: string | null; post_id?: string | null };
export type Photo = { id: string; album_id: string; image_key: string; thumb_key: string; width: number; height: number; bytes: number; mime: string; draft_alt: string; draft_position: number; draft_deleted: number; published_alt: string | null; published_position: number | null };
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
export const error = (message: string, status = 400) => json({ error: message }, status);
export const noStore = { 'cache-control': 'no-store' };

export function validateContent(value: unknown, kind: 'posts' | 'albums'): Content {
  if (!value || typeof value !== 'object') throw new Error('Faltan datos.');
  const v = value as Record<string, unknown>;
  const field = (key: string, max: number, required = true) => {
    if (typeof v[key] !== 'string') throw new Error(`El campo ${key} no es válido.`);
    const s = (v[key] as string).trim();
    if ((required && !s) || s.length > max) throw new Error(`El campo ${key} debe tener entre ${required ? 1 : 0} y ${max} caracteres.`);
    return s;
  };
  const title = field('title', 150);
  const excerpt = kind === 'posts' ? field('excerpt', 320) : field('description', 1000, false);
  const body = kind === 'posts' ? field('body', 20000) : '';
  const category = kind === 'posts' ? field('category', 50) : 'Galería';
  const coverPhotoId = v.coverPhotoId == null || v.coverPhotoId === '' ? null : String(v.coverPhotoId);
  if (coverPhotoId && !/^[0-9a-f-]{36}$/.test(coverPhotoId)) throw new Error('Portada no válida.');
  return { title, excerpt, body, category, coverPhotoId, ...(kind === 'albums' ? { description: excerpt } : {}) };
}
export function validateSlug(slug: unknown): string {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new Error('El slug solo puede contener letras minúsculas, números y guiones.');
  return slug;
}
export function parseBody(text: string): string[] { return text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean); }

export async function identity(request: Request): Promise<string | null> {
  const b = bindings();
  const host = new URL(request.url).hostname;
  if (import.meta.env.DEV && b.ENVIRONMENT === 'local' && b.LOCAL_ADMIN_BYPASS === '1' && (host === 'localhost' || host === '127.0.0.1')) return 'local-admin';
  if (!b.ACCESS_TEAM_DOMAIN || !b.ACCESS_AUD || !b.ADMIN_EMAIL) return null;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return null;
  try {
    const issuer = b.ACCESS_TEAM_DOMAIN.replace(/\/$/, '');
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: b.ACCESS_AUD });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === b.ADMIN_EMAIL.toLowerCase() ? payload.email : null;
  } catch { return null; }
}
export async function csrfToken(email: string): Promise<string> {
  const secret = bindings().CSRF_SECRET;
  if (!secret && email !== 'local-admin') throw new Error('Falta CSRF_SECRET.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret || 'local-development-only'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const day = Math.floor(Date.now() / 86400000);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${email}:${day}`));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function authorize(request: Request, mutation = false): Promise<Response | null> {
  const email = await identity(request);
  if (!email) return error('Acceso no autorizado.', 401);
  if (!mutation) return null;
  if (!bindings().CSRF_SECRET && email !== 'local-admin') return error('Configuración de seguridad incompleta.', 503);
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin || request.headers.get('x-cdm-csrf') !== await csrfToken(email)) return error('Verificación de solicitud fallida.', 403);
  const minute = Math.floor(Date.now() / 60000);
  await bindings().DB.prepare('INSERT INTO request_limits(identity,minute,hits) VALUES(?,?,1) ON CONFLICT(identity,minute) DO UPDATE SET hits=hits+1').bind(email, minute).run();
  const rate = await bindings().DB.prepare('SELECT hits FROM request_limits WHERE identity=? AND minute=?').bind(email, minute).first<{ hits: number }>();
  if ((rate?.hits || 0) > 60) return error('Demasiadas solicitudes. Espera un minuto.', 429);
  return null;
}
export function failure(e: unknown): Response {
  const message = e instanceof Error ? e.message : 'Error inesperado.';
  return error(message.includes('UNIQUE constraint') ? 'El slug ya existe.' : message, message.includes('UNIQUE constraint') ? 409 : message.includes('demasiado grande') ? 413 : 400);
}
export async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length') || 0) > 30000) throw new Error('Solicitud demasiado grande.');
  const text = await request.text();
  if (text.length > 30000) throw new Error('Solicitud demasiado grande.');
  return JSON.parse(text);
}
export async function readLimitedForm(request: Request, maxBytes: number): Promise<FormData> {
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new Error('Subida demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Falta el archivo.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error('Subida demasiado grande.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }).formData();
}
export async function publishedList(table: 'posts' | 'albums', page: number, limit = 9): Promise<Row[]> {
  const n = Math.max(1, Math.min(10000, page || 1));
  const result = await bindings().DB.prepare(`SELECT * FROM ${table} WHERE published_json IS NOT NULL ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`).bind(limit, (n - 1) * limit).all<Row>();
  return result.results;
}
export async function publishedBySlug(table: 'posts' | 'albums', slug: string): Promise<Row | null> {
  return bindings().DB.prepare(`SELECT * FROM ${table} WHERE published_slug = ? AND published_json IS NOT NULL`).bind(slug).first<Row>();
}
export async function photosForAlbum(albumId: string, published: boolean): Promise<Photo[]> {
  return (await bindings().DB.prepare(`SELECT * FROM photos WHERE album_id = ? AND ${published ? 'published_position IS NOT NULL' : 'draft_deleted = 0'} ORDER BY ${published ? 'published_position' : 'draft_position'}`).bind(albumId).all<Photo>()).results;
}
export function photoUrl(id: string, size: 'thumb' | 'web' = 'thumb'): string { return `/media/${id}/${size}`; }

// Decode WebP VP8X/VP8L/VP8 headers; MIME and extension supplied by the client are ignored.
export function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) return null;
  const chunkLength = view.getUint32(16, true);
  if (chunkLength < 10 || 20 + chunkLength + (chunkLength % 2) > bytes.length) return null;
  const tag = String.fromCharCode(...bytes.slice(12, 16));
  if (tag === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
  if (tag === 'VP8L' && bytes[20] === 0x2f) return { width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), height: 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)) };
  if (tag === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: ((bytes[27] << 8) | bytes[26]) & 0x3fff, height: ((bytes[29] << 8) | bytes[28]) & 0x3fff };
  return null;
}

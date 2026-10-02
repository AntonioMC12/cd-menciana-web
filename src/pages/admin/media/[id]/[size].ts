import type { APIRoute } from 'astro';
import { bindings, identity, type Photo } from '../../../../lib/cms';
export const prerender = false;
const missing = () => new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
export const GET: APIRoute = async ({ request, params }) => {
  if (!(await identity(request))) return missing();
  if (!params.id || (params.size !== 'thumb' && params.size !== 'web')) return missing();
  const photo = await bindings().DB.prepare('SELECT * FROM photos WHERE id=? AND draft_deleted=0').bind(params.id).first<Photo>();
  if (!photo) return missing();
  const object = await bindings().PHOTOS.get(params.size === 'thumb' ? photo.thumb_key : photo.image_key);
  if (!object) return missing();
  return new Response(object.body as unknown as ReadableStream, { headers: { 'content-type': 'image/webp', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
};

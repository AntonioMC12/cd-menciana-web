import type { APIRoute } from 'astro';
import { bindings, type Photo } from '../../../src/lib/cms';
export const prerender = false;
const missing = () => new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
export const GET: APIRoute = async ({ params }) => {
  if (!params.id || (params.size !== 'thumb' && params.size !== 'web')) return missing();
  const photo = await bindings().DB.prepare('SELECT * FROM photos WHERE id=?').bind(params.id).first<Photo>();
  if (!photo) return missing();
  const publicAlbum = photo.published_position != null && await bindings().DB.prepare('SELECT id FROM albums WHERE id=? AND published_json IS NOT NULL').bind(photo.album_id).first();
  const publicCover = await bindings().DB.prepare('SELECT id FROM posts WHERE published_json IS NOT NULL AND json_extract(published_json,\'$.coverPhotoId\')=?').bind(photo.id).first();
  const published = Boolean(publicAlbum || publicCover);
  if (!published) return missing();
  const object = await bindings().PHOTOS.get(params.size === 'thumb' ? photo.thumb_key : photo.image_key);
  if (!object) return missing();
  return new Response(object.body as unknown as ReadableStream, { headers: { 'content-type': 'image/webp', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" } });
};

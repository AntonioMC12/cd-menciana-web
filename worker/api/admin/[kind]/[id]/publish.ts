import type { APIRoute } from 'astro';
import { requestSiteRebuild } from '../../../../../src/lib/site-rebuild';
import { authorize, bindings, error, failure, json, type Row, type Content } from '../../../../../src/lib/cms';
export const prerender = false;
export const POST: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = params.kind === 'posts' || params.kind === 'albums' ? params.kind : null;
  if (!kind || !params.id) return error('Ruta no válida.', 404);
  try {
    const row = await bindings().DB.prepare(`SELECT * FROM ${kind} WHERE id=?`).bind(params.id).first<Row>();
    if (!row) return error('No encontrado.', 404);
    if (await bindings().DB.prepare(`SELECT id FROM ${kind} WHERE id<>? AND (slug=? OR published_slug=?)`).bind(row.id, row.slug, row.slug).first()) return error('El slug ya está reservado.', 409);
    const draft = JSON.parse(row.draft_json) as Content;
    if (draft.coverPhotoId) {
      const photo = await bindings().DB.prepare('SELECT p.id,p.image_key,p.thumb_key,a.id AS album_id FROM photos p JOIN albums a ON a.id=p.album_id WHERE p.id=? AND p.draft_deleted=0').bind(draft.coverPhotoId).first<{ id: string; image_key: string; thumb_key: string; album_id: string }>();
      if (!photo || (kind === 'albums' && photo.album_id !== row.id) || !(await bindings().PHOTOS.head(photo.image_key)) || !(await bindings().PHOTOS.head(photo.thumb_key))) return error('La portada no está disponible.', 409);
    }
    if (kind === 'albums') {
      const photos = (await bindings().DB.prepare('SELECT * FROM photos WHERE album_id=? AND draft_deleted=0').bind(row.id).all<{ image_key: string; thumb_key: string }>()).results;
      for (const photo of photos) if (!(await bindings().PHOTOS.head(photo.image_key)) || !(await bindings().PHOTOS.head(photo.thumb_key))) return error('Una fotografía no está disponible.', 409);
      const removed = (await bindings().DB.prepare('SELECT image_key,thumb_key FROM photos WHERE album_id=? AND draft_deleted=1 AND published_position IS NOT NULL').bind(row.id).all<{ image_key: string; thumb_key: string }>()).results;
      const statements = [
        bindings().DB.prepare('UPDATE photos SET published_alt=draft_alt,published_position=draft_position WHERE album_id=? AND draft_deleted=0 AND EXISTS (SELECT 1 FROM albums WHERE id=? AND version=?)').bind(row.id, row.id, row.version),
        bindings().DB.prepare('UPDATE photos SET published_alt=NULL,published_position=NULL WHERE album_id=? AND draft_deleted=1 AND EXISTS (SELECT 1 FROM albums WHERE id=? AND version=?)').bind(row.id, row.id, row.version),
        bindings().DB.prepare('UPDATE albums SET published_json=draft_json,published_slug=slug,published_version=version,published_at=COALESCE(published_at,CURRENT_TIMESTAMP) WHERE id=? AND version=?').bind(row.id, row.version),
      ];
      const results = await bindings().DB.batch(statements);
      if (!results[2].meta.changes) return error('El álbum cambió en otra sesión. Recarga.', 409);
      for (const photo of removed) for (const key of [photo.image_key, photo.thumb_key]) await bindings().DB.prepare('INSERT OR IGNORE INTO object_deletions(object_key) VALUES(?)').bind(key).run();
      return json({ ok: true, siteUpdate: await requestSiteRebuild() });
    }
    const result = await bindings().DB.prepare(`UPDATE ${kind} SET published_json=draft_json,published_slug=slug,published_version=version,published_at=COALESCE(published_at,CURRENT_TIMESTAMP) WHERE id=? AND version=?`).bind(row.id, row.version).run();
    if (!result.meta.changes) return error('El contenido cambió en otra sesión. Recarga.', 409);
    return json({ ok: true, siteUpdate: await requestSiteRebuild() });
  } catch (e) { return failure(e); }
};

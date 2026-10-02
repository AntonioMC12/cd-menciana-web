import type { APIRoute } from 'astro';
import { authorize, bindings, error, failure, json, readJson, type Photo } from '../../../../lib/cms';
export const prerender = false;
export const PUT: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  if (!params.id) return error('Foto no válida.', 404);
  try {
    const input = await readJson(request) as Record<string, unknown>;
    const alt = typeof input.alt === 'string' ? input.alt.trim() : '';
    const position = Number(input.position);
    const version = Number(input.version);
    if (!alt || alt.length > 240 || !Number.isSafeInteger(position) || position < 0 || position > 100) return error('Descripción u orden no válidos.');
    if (!Number.isSafeInteger(version)) return error('Versión no válida.');
    const photo = await bindings().DB.prepare('SELECT album_id FROM photos WHERE id=?').bind(params.id).first<{ album_id: string }>();
    if (!photo) return error('Foto no encontrada.', 404);
    const updated = await bindings().DB.prepare('UPDATE albums SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?').bind(photo.album_id, version).run();
    if (!updated.meta.changes) return error('El álbum cambió en otra sesión. Recarga.', 409);
    await bindings().DB.prepare('UPDATE photos SET draft_alt=?,draft_position=? WHERE id=? AND draft_deleted=0').bind(alt, position, params.id).run();
    return json({ ok: true });
  } catch (e) { return failure(e); }
};
export const DELETE: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  if (!params.id) return error('Foto no válida.', 404);
  try {
    const input = await readJson(request) as Record<string, unknown>;
    const version = Number(input.version);
    if (!Number.isSafeInteger(version)) return error('Versión no válida.');
    const photo = await bindings().DB.prepare('SELECT * FROM photos WHERE id=?').bind(params.id).first<Photo>();
    if (!photo) return error('Foto no encontrada.', 404);
    const updated = await bindings().DB.prepare('UPDATE albums SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?').bind(photo.album_id, version).run();
    if (!updated.meta.changes) return error('El álbum cambió en otra sesión. Recarga.', 409);
    await bindings().DB.prepare('UPDATE photos SET draft_deleted=1 WHERE id=?').bind(params.id).run();
    // Published photo stays visible until the album is published again or withdrawn.
    if (photo.published_position == null) {
      await bindings().DB.batch([
        bindings().DB.prepare('INSERT OR IGNORE INTO object_deletions(object_key) VALUES(?)').bind(photo.image_key),
        bindings().DB.prepare('INSERT OR IGNORE INTO object_deletions(object_key) VALUES(?)').bind(photo.thumb_key),
      ]);
    }
    return json({ ok: true });
  } catch (e) { return failure(e); }
};

import type { APIRoute } from 'astro';
import { authorize, bindings, error, failure, json, readJson, validateContent, validateSlug, type Row, type Photo } from '../../../../src/lib/cms';
export const prerender = false;
const kindOf = (value: string | undefined): 'posts' | 'albums' | null => value === 'posts' || value === 'albums' ? value : null;
const rowFor = (kind: 'posts' | 'albums', id: string) => bindings().DB.prepare(`SELECT * FROM ${kind} WHERE id=?`).bind(id).first<Row>();
export const GET: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request); if (deny) return deny;
  const kind = kindOf(params.kind); if (!kind || !params.id) return error('Ruta no válida.', 404);
  const row = await rowFor(kind, params.id); if (!row) return error('No encontrado.', 404);
  const photos = kind === 'albums' ? (await bindings().DB.prepare('SELECT * FROM photos WHERE album_id=? ORDER BY draft_position').bind(row.id).all<Photo>()).results : [];
  return json({ ...row, draft: JSON.parse(row.draft_json), published: row.published_json ? JSON.parse(row.published_json) : null, photos });
};
export const PUT: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = kindOf(params.kind); if (!kind || !params.id) return error('Ruta no válida.', 404);
  try {
    const input = await readJson(request) as Record<string, unknown>;
    const version = Number(input.version);
    if (!Number.isSafeInteger(version) || version < 1) return error('Versión no válida.', 400);
    const slug = validateSlug(input.slug);
    const content = validateContent(input, kind);
    const postId = kind === 'albums' && input.postId ? String(input.postId) : null;
    if (postId && !(await bindings().DB.prepare('SELECT id FROM posts WHERE id=?').bind(postId).first())) return error('La publicación asociada no existe.', 400);
    const query = kind === 'albums'
      ? 'UPDATE albums SET slug=?,draft_json=?,post_id=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?'
      : 'UPDATE posts SET slug=?,draft_json=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?';
    const args = kind === 'albums' ? [slug, JSON.stringify(content), postId, params.id, version] : [slug, JSON.stringify(content), params.id, version];
    const result = await bindings().DB.prepare(query).bind(...args).run();
    if (!result.meta.changes) return error('El contenido cambió en otra sesión. Recarga antes de guardar.', 409);
    return json({ version: version + 1 });
  } catch (e) { return failure(e); }
};
export const DELETE: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = kindOf(params.kind); if (!kind || !params.id) return error('Ruta no válida.', 404);
  try {
    const row = await rowFor(kind, params.id); if (!row) return error('No encontrado.', 404);
    if (row.published_json) return error('Retira primero el contenido público.', 409);
    if (kind === 'albums') {
      const used = await bindings().DB.prepare(`SELECT posts.id FROM posts JOIN photos ON json_extract(posts.published_json,'$.coverPhotoId')=photos.id WHERE photos.album_id=? AND posts.published_json IS NOT NULL LIMIT 1`).bind(row.id).first();
      if (used) return error('Una noticia publicada usa una foto de este álbum como portada.', 409);
      const photos = (await bindings().DB.prepare('SELECT image_key,thumb_key FROM photos WHERE album_id=?').bind(row.id).all<Photo>()).results;
      for (const photo of photos) await bindings().DB.batch([
        bindings().DB.prepare('INSERT OR IGNORE INTO object_deletions(object_key) VALUES(?)').bind(photo.image_key),
        bindings().DB.prepare('INSERT OR IGNORE INTO object_deletions(object_key) VALUES(?)').bind(photo.thumb_key),
      ]);
    }
    await bindings().DB.prepare(`DELETE FROM ${kind} WHERE id=? AND published_json IS NULL`).bind(row.id).run();
    return json({ ok: true });
  } catch (e) { return failure(e); }
};

import type { APIRoute } from 'astro';
import { authorize, bindings, failure, json } from '../../../lib/cms';
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  try {
    const rows = (await bindings().DB.prepare('SELECT object_key FROM object_deletions ORDER BY created_at LIMIT 20').all<{ object_key: string }>()).results;
    let removed = 0;
    for (const row of rows) {
      const referenced = await bindings().DB.prepare(`SELECT p.id FROM photos p WHERE (p.image_key=? OR p.thumb_key=?) AND (p.published_position IS NOT NULL OR EXISTS (SELECT 1 FROM posts WHERE published_json IS NOT NULL AND json_extract(published_json,'$.coverPhotoId')=p.id))`).bind(row.object_key, row.object_key).first();
      if (referenced) continue;
      try {
        await bindings().PHOTOS.delete(row.object_key);
        await bindings().DB.prepare('DELETE FROM object_deletions WHERE object_key=?').bind(row.object_key).run();
        removed++;
      } catch { await bindings().DB.prepare('UPDATE object_deletions SET attempts=attempts+1 WHERE object_key=?').bind(row.object_key).run(); }
    }
    await bindings().DB.prepare('DELETE FROM request_limits WHERE minute<?').bind(Math.floor(Date.now() / 60000) - 1440).run();
    return json({ removed, remaining: rows.length - removed });
  } catch (e) { return failure(e); }
};

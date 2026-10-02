import type { APIRoute } from 'astro';
import { authorize, bindings, error, failure, json, readJson, validateContent, validateSlug, type Row } from '../../../../lib/cms';
export const prerender = false;
const kindOf = (value: string | undefined): 'posts' | 'albums' | null => value === 'posts' || value === 'albums' ? value : null;
export const GET: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request); if (deny) return deny;
  const kind = kindOf(params.kind); if (!kind) return error('Ruta no válida.', 404);
  const rows = await bindings().DB.prepare(`SELECT * FROM ${kind} ORDER BY updated_at DESC LIMIT 100`).all<Row>();
  return json(rows.results.map(row => ({ ...row, draft: JSON.parse(row.draft_json), published: row.published_json ? JSON.parse(row.published_json) : null })));
};
export const POST: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = kindOf(params.kind); if (!kind) return error('Ruta no válida.', 404);
  try {
    const input = await readJson(request) as Record<string, unknown>;
    const slug = validateSlug(input.slug);
    const content = validateContent(input, kind);
    const id = crypto.randomUUID();
    if (kind === 'albums') {
      const postId = input.postId == null || input.postId === '' ? null : String(input.postId);
      if (postId && !(await bindings().DB.prepare('SELECT id FROM posts WHERE id=?').bind(postId).first())) throw new Error('La publicación asociada no existe.');
      await bindings().DB.prepare('INSERT INTO albums(id,slug,draft_json,post_id) VALUES(?,?,?,?)').bind(id, slug, JSON.stringify(content), postId).run();
    } else await bindings().DB.prepare('INSERT INTO posts(id,slug,draft_json) VALUES(?,?,?)').bind(id, slug, JSON.stringify(content)).run();
    return json({ id, slug, version: 1 }, 201);
  } catch (e) { return failure(e); }
};

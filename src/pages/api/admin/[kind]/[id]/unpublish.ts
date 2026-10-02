import type { APIRoute } from 'astro';
import { authorize, bindings, error, failure, json } from '../../../../../lib/cms';
export const prerender = false;
export const POST: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = params.kind === 'posts' || params.kind === 'albums' ? params.kind : null;
  if (!kind || !params.id) return error('Ruta no válida.', 404);
  try {
    await bindings().DB.prepare(`UPDATE ${kind} SET published_json=NULL,published_slug=NULL,published_version=NULL,published_at=NULL WHERE id=?`).bind(params.id).run();
    return json({ ok: true });
  } catch (e) { return failure(e); }
};

import type { APIRoute } from 'astro';
import { requestSiteRebuild } from '../../../../../src/lib/site-rebuild';
import { authorize, bindings, error, failure, json } from '../../../../../src/lib/cms';
export const prerender = false;
export const POST: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  const kind = params.kind === 'posts' || params.kind === 'albums' ? params.kind : null;
  if (!kind || !params.id) return error('Ruta no válida.', 404);
  try {
    await bindings().DB.prepare(`UPDATE ${kind} SET published_json=NULL,published_slug=NULL,published_version=NULL,published_at=NULL WHERE id=?`).bind(params.id).run();
    return json({ ok: true, siteUpdate: await requestSiteRebuild() });
  } catch (e) { return failure(e); }
};

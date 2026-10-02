import type { APIRoute } from 'astro';
import { authorize, bindings, json } from '../../../lib/cms';
export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const deny = await authorize(request); if (deny) return deny;
  const result = await bindings().DB.prepare('SELECT p.id,p.draft_alt,a.draft_json FROM photos p JOIN albums a ON a.id=p.album_id WHERE p.draft_deleted=0 ORDER BY p.created_at DESC LIMIT 200').all<{ id: string; draft_alt: string; draft_json: string }>();
  return json(result.results.map(x => ({ id: x.id, label: `${JSON.parse(x.draft_json).title}: ${x.draft_alt}` })));
};

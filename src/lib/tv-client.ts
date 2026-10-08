import type { TvSnapshot } from './youtube';
// Share one public request between the menu and CDM TV during each page visit.
const requests = new Map<string, Promise<{ ok: boolean; data: TvSnapshot }>>();
export function fetchTv(api: string, refresh = false) {
  if (refresh || !requests.has(api)) requests.set(api, (async () => {
    const response = await fetch(`${api}/api/cdm-tv`, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
    return { ok: response.ok, data: await response.json() as TvSnapshot };
  })());
  return requests.get(api)!;
}

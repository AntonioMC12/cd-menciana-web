import { bindings } from './cms';

export type SiteUpdate = 'requested' | 'not_configured' | 'failed';

// Publication is already committed: a deploy failure must never undo it or
// report a failed publication. The scheduled rebuild remains the fallback.
export async function requestSiteRebuild(): Promise<SiteUpdate> {
  const token = bindings().GITHUB_DEPLOY_TOKEN;
  if (!token) return 'not_configured';
  try {
    const response = await fetch('https://api.github.com/repos/AntonioMC12/cd-menciana-web/actions/workflows/deploy.yml/dispatches', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'cd-menciana-cms',
        'x-github-api-version': '2026-03-10',
      },
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    await response.body?.cancel();
    if (response.ok) return 'requested';
    console.error(JSON.stringify({ event: 'site_rebuild_failed', status: response.status }));
  } catch {
    console.error(JSON.stringify({ event: 'site_rebuild_failed', reason: 'network_or_timeout' }));
  }
  return 'failed';
}

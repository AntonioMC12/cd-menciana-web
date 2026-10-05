import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './worker-env';
import { requestSiteRebuild } from '../src/lib/site-rebuild';
import { POST as publish } from '../worker/api/admin/[kind]/[id]/publish';
import { POST as unpublish } from '../worker/api/admin/[kind]/[id]/unpublish';
import { csrfToken } from '../src/lib/cms';

beforeEach(() => { for (const key of Object.keys(env)) delete env[key]; });
afterEach(() => vi.restoreAllMocks());

describe('CMS deployment notification', () => {
  it('does not call GitHub without a configured secret', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(await requestSiteRebuild()).toBe('not_configured');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([200, 204])('requests only the main deployment when GitHub accepts it (%s)', async status => {
    env.GITHUB_DEPLOY_TOKEN = 'test-token';
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }));
    expect(await requestSiteRebuild()).toBe('requested');
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/AntonioMC12/cd-menciana-web/actions/workflows/deploy.yml/dispatches', expect.objectContaining({
      method: 'POST', body: '{"ref":"main"}', redirect: 'error',
      headers: expect.objectContaining({ authorization: 'Bearer test-token' }),
    }));
  });
  it('reports rejected and unavailable deployments without leaking the token', async () => {
    env.GITHUB_DEPLOY_TOKEN = 'test-token';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }));
    expect(await requestSiteRebuild()).toBe('failed');
    fetch.mockRejectedValue(new Error('test-token'));
    expect(await requestSiteRebuild()).toBe('failed');
    expect(JSON.stringify(log.mock.calls)).not.toContain('test-token');
  });
  it.each([publish, unpublish])('keeps the CMS mutation successful if the deployment fails', async route => {
    env.ENVIRONMENT = 'local'; env.LOCAL_ADMIN_BYPASS = '1'; env.GITHUB_DEPLOY_TOKEN = 'test-token';
    const run = vi.fn(async () => ({ meta: { changes: 1 } }));
    env.DB = { prepare: (sql: string) => ({ bind: () => ({
      run,
      first: async () => sql.includes('SELECT *') ? { id: 'id', slug: 'test', version: 1, draft_json: '{"coverPhotoId":null}' } : null,
    }) }) };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 403 }));
    const request = new Request('http://localhost/api/admin/posts/id/publish', { method: 'POST', headers: { origin: 'http://localhost', 'x-cdm-csrf': await csrfToken('local-admin') } });
    const response = await route({ request, params: { kind: 'posts', id: 'id' } } as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, siteUpdate: 'failed' });
    expect(run).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('never requests a deployment for unauthorized mutations', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const response = await publish({ request: new Request('https://cms.cdmenciana.es/api/admin/posts/id/publish'), params: { kind: 'posts', id: 'id' } } as never);
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

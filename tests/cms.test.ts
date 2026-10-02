import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { env } from './worker-env';
import { authorize, csrfToken, identity, validateContent, validateSlug, webpDimensions } from '../src/lib/cms';
import { persistObjects } from '../src/lib/photo-storage';

beforeEach(() => { for (const key of Object.keys(env)) delete env[key]; });
describe('input and photo validation', () => {
  it('rejects duplicate style slugs and active image formats', () => {
    expect(() => validateSlug('Wrong Slug')).toThrow();
    expect(validateSlug('club-2026')).toBe('club-2026');
    expect(webpDimensions(new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).toBeNull();
    expect(webpDimensions(new Uint8Array(30))).toBeNull();
  });
  it('limits editable text and keeps it as plain text', () => {
    expect(() => validateContent({ title: 'x', excerpt: 'x', body: 'x'.repeat(20001), category: 'Club' }, 'posts')).toThrow();
    const value = validateContent({ title: '<script>x</script>', excerpt: 'x', body: '<b>texto</b>', category: 'Club' }, 'posts');
    expect(value.body).toBe('<b>texto</b>');
  });
});
describe('authorization', () => {
  it('fails closed without configuration and blocks bad CSRF', async () => {
    const request = new Request('http://localhost/admin/');
    expect(await identity(request)).toBeNull();
    env.ENVIRONMENT = 'local'; env.LOCAL_ADMIN_BYPASS = '1';
    expect(await identity(request)).toBe('local-admin');
    const bad = new Request('http://localhost/api/admin/posts', { method: 'POST', headers: { origin: 'http://attacker.test', 'x-cdm-csrf': await csrfToken('local-admin') } });
    expect((await authorize(bad, true))?.status).toBe(403);
  });
  it('checks Access signature, audience, expiry and authorized email', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey); jwk.kid = 'key-1';
    const server = createServer((_, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('No server');
      const issuer = `http://127.0.0.1:${address.port}`;
      env.ACCESS_TEAM_DOMAIN = issuer; env.ACCESS_AUD = 'expected'; env.ADMIN_EMAIL = 'club@example.org';
      const sign = (email: string, audience = 'expected', expired = false) => new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'key-1' }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expired ? -1 : '5m').sign(privateKey);
      const check = async (token: string) => identity(new Request('https://club.test/admin', { headers: { 'cf-access-jwt-assertion': token } }));
      expect(await check(await sign('club@example.org'))).toBe('club@example.org');
      expect(await check(await sign('other@example.org'))).toBeNull();
      expect(await check(await sign('club@example.org', 'wrong'))).toBeNull();
      expect(await check(await sign('club@example.org', 'expected', true))).toBeNull();
      expect(await check('forged.jwt.value')).toBeNull();
    } finally { server.close(); }
  });
});
describe('R2 and D1 consistency', () => {
  it('removes both objects when metadata persistence fails', async () => {
    const deleted: string[] = [];
    const bucket = { put: vi.fn(async () => ({})), delete: vi.fn(async (key: string) => { deleted.push(key); }) };
    await expect(persistObjects(bucket as any, 'web', 'thumb', new Uint8Array(1), new Uint8Array(1), async () => { throw new Error('D1 failure'); })).rejects.toThrow('D1 failure');
    expect(deleted).toEqual(['web', 'thumb']);
  });
});

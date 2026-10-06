import { bindings, identity } from '../../src/lib/cms';

export const STOCK_ROOT = '/tienda/stock';
export interface StockSession { token_hash: string; purpose: 'login' | 'app'; csrf: string; actor: string; credential_hash: string; expires_at: number }
export class StockError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const digest = async (text: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export function secureRequest(request: Request) {
  const url = new URL(request.url);
  return url.protocol === 'https:' || (bindings().ENVIRONMENT === 'local' && ['localhost', '127.0.0.1'].includes(url.hostname));
}
const cookieName = (request: Request, purpose: 'login' | 'app') => `${new URL(request.url).protocol === 'https:' ? '__Host-' : ''}cdm-stock-${purpose}`;
export function sessionCookie(request: Request, purpose: 'login' | 'app', token: string, age: number) {
  return `${cookieName(request, purpose)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function session(request: Request, purpose: 'login' | 'app' = 'app'): Promise<StockSession | null> {
  if (!secureRequest(request)) return null;
  const value = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName(request, purpose)}=`))?.split('=')[1];
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  if (!bindings().STOCK_PASSWORD_HASH) return null;
  return bindings().DB.prepare('SELECT * FROM stock_sessions WHERE token_hash=? AND purpose=? AND expires_at>? AND credential_hash=?').bind(await digest(value), purpose, Math.floor(Date.now() / 1000), await digest(bindings().STOCK_PASSWORD_HASH!)).first<StockSession>();
}
export async function createSession(request: Request, purpose: 'login' | 'app', actor = 'Administración del club') {
  const token = random(), csrf = random(), age = purpose === 'app' ? 28800 : 900;
  const now = Math.floor(Date.now() / 1000);
  await bindings().DB.batch([
    bindings().DB.prepare('DELETE FROM stock_sessions WHERE expires_at<=?').bind(now),
    bindings().DB.prepare('INSERT INTO stock_sessions(token_hash,purpose,csrf,actor,credential_hash,expires_at) VALUES(?,?,?,?,?,?)').bind(await digest(token), purpose, csrf, actor, await digest(bindings().STOCK_PASSWORD_HASH || ''), now + age),
  ]);
  return { csrf, cookie: sessionCookie(request, purpose, token, age) };
}
export function checkCsrf(request: Request, current: StockSession, token: string | null) {
  if (request.headers.get('origin') !== new URL(request.url).origin || token !== current.csrf) throw new StockError('No se pudo verificar la solicitud. Recarga la página.', 403);
}
export async function requireStockAccess(request: Request) {
  const config = bindings();
  if (!config.ACCESS_TEAM_DOMAIN && !config.ACCESS_AUD && !config.ADMIN_EMAIL) return;
  if (!config.ACCESS_TEAM_DOMAIN || !config.ACCESS_AUD || !config.ADMIN_EMAIL) throw new StockError('La configuración del acceso administrativo está incompleta.',503);
  if (!await identity(request)) throw new StockError('Completa primero el acceso administrativo de Cloudflare Access y vuelve a abrir esta dirección.',401);
}
export async function login(request: Request, password: string) {
  await requireStockAccess(request);
  const encoded = bindings().STOCK_PASSWORD_HASH;
  if (!encoded) throw new StockError('El acceso todavía no está configurado.', 503);
  if (!secureRequest(request)) throw new StockError('El acceso requiere HTTPS.', 503);
  const now = Math.floor(Date.now() / 1000), bucket = Math.floor(now / 900);
  const address = request.headers.get('cf-connecting-ip') || 'local';
  const key = await digest(`${encoded}:${address}`);
  const rate = await bindings().DB.prepare('INSERT INTO stock_login_limits(identity,bucket,hits) VALUES(?,?,1) ON CONFLICT(identity,bucket) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key, bucket).first<{ hits: number }>();
  await bindings().DB.prepare('DELETE FROM stock_login_limits WHERE bucket<?').bind(bucket - 2).run();
  if ((rate?.hits || 0) > 5) throw new StockError('Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.', 429);
  if (!await verifyPassword(password, encoded)) throw new StockError('No se pudo iniciar sesión. Revisa la contraseña.', 401);
  const actor = await identity(request) || 'Administración del club';
  return createSession(request, 'app', actor);
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, count, salt, expected] = encoded.split('$');
  const iterations = Number(count);
  if (algorithm !== 'pbkdf2-sha256' || iterations !== 100000 || !/^[a-f0-9]{64}$/.test(salt || '') || !/^[a-f0-9]{64}$/.test(expected || '') || password.length > 256) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(salt.match(/../g)!, h => parseInt(h, 16)), iterations }, key, 256));
  const target = Uint8Array.from(expected.match(/../g)!, h => parseInt(h, 16));
  // Constant work for fixed-length hashes, no early exit on a differing byte.
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ target[i];
  return difference === 0;
}
export async function stockJson(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new StockError('Faltan datos.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new StockError('Solicitud demasiado grande.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new StockError('Datos no válidos.'); }
}

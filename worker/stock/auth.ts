import { authorize, bindings, identity } from '../../src/lib/cms';

export const STOCK_ROOT = '/tienda/stock';
export class StockError extends Error { constructor(message: string, public status = 400) { super(message); } }
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
export const digest = async (text: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
export function secureRequest(request: Request) {
  const url = new URL(request.url);
  return url.protocol === 'https:' || (bindings().ENVIRONMENT === 'local' && ['localhost', '127.0.0.1'].includes(url.hostname));
}
export async function requireStockAccess(request: Request, mutation = false): Promise<string> {
  const config = bindings();
  if ((config.ACCESS_TEAM_DOMAIN || config.ACCESS_AUD || config.ADMIN_EMAIL) && (!config.ACCESS_TEAM_DOMAIN || !config.ACCESS_AUD || !config.ADMIN_EMAIL)) throw new StockError('La configuración del acceso administrativo está incompleta.', 503);
  const denied = await authorize(request, mutation);
  if (denied) throw new StockError((await denied.json() as { error: string }).error, denied.status);
  return (await identity(request))!;
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

import { bindings } from '../../src/lib/cms';
import { products, type ShopProduct } from '../../src/data/shop';
import { digest, StockError } from './auth';

export interface Variant {
  id: string; product_id: string; options_json: string; options_key: string; sku: string;
  quantity: number; low_threshold: number | null; configured: number; active: number; version: number; updated_at: string;
}
export interface ProductRef { id: string; metadata: string; source_active: number; updated_at: string }
export interface Movement { id: string; variant_id: string; kind: string; previous_quantity: number; next_quantity: number; difference: number; reason: string; note: string; actor: string; request_hash: string; options_json: string; created_at: string }
export function integer(value: unknown, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > 1000000) throw new StockError('Introduce una cantidad entera válida, entre 0 y 1.000.000.');
  return value;
}
export function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new StockError('Revisa los campos de texto.');
  return value.trim();
}
export function normalizeOptions(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StockError('Las opciones de la variante no son válidas.');
  const entries = Object.entries(value);
  if (entries.length > 6) throw new StockError('Una variante admite hasta seis opciones.');
  const options: Record<string, string> = {}, canonical: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    const key = text(rawKey, 30, true).normalize('NFKC').toLocaleLowerCase('es');
    const val = text(rawValue, 60, true).normalize('NFKC');
    if (['__proto__', 'constructor', 'prototype'].includes(key) || Object.hasOwn(options, key)) throw new StockError('Opciones repetidas o no válidas.');
    options[key] = val; canonical[key] = val.toLocaleLowerCase('es');
  }
  // Order keys after normalization, so order/case/whitespace cannot bypass uniqueness.
  return { options, key: JSON.stringify(Object.fromEntries(Object.entries(canonical).sort(([a], [b]) => a.localeCompare(b)))) };
}
function sourceOptions(product: ShopProduct): Record<string, string>[] {
  const sizes = product.sizes?.length ? product.sizes : [''];
  const variants = product.variants?.length ? product.variants : [''];
  return sizes.flatMap(size => variants.map(variant => ({ ...(size ? { talla: size } : {}), ...(variant ? { variante: variant } : {}) })));
}
export async function syncInventory(catalogue: ShopProduct[] = products) {
  const db = bindings().DB;
  const statements = catalogue.map(product => db.prepare(`INSERT INTO stock_products(id,metadata,source_active) VALUES(?,?,?)
    ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, source_active=excluded.source_active, updated_at=CURRENT_TIMESTAMP
    WHERE stock_products.metadata<>excluded.metadata OR stock_products.source_active<>excluded.source_active`).bind(product.id, JSON.stringify(product), product.archived ? 0 : 1));
  // Deleted source entries become archived references; their variants and history stay intact.
  statements.push(db.prepare(`UPDATE stock_products SET source_active=0,updated_at=CURRENT_TIMESTAMP WHERE source_active=1 AND id NOT IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(catalogue.filter(p => !p.archived).map(p => p.id))));
  for (const product of catalogue) {
    // Only initialize a product with no variants. Later edits must not resurrect archived variants.
    const candidates = sourceOptions(product).map(options => ({ id: crypto.randomUUID(), ...normalizeOptions(options) }));
    statements.push(db.prepare(`INSERT INTO stock_variants(id,product_id,options_json,options_key)
      SELECT json_extract(value,'$.id'),?,json_extract(value,'$.options'),json_extract(value,'$.key') FROM json_each(?)
      WHERE NOT EXISTS(SELECT 1 FROM stock_variants WHERE product_id=?) ON CONFLICT(product_id,options_key) DO NOTHING`).bind(product.id, JSON.stringify(candidates), product.id));
  }
  if (statements.length) await db.batch(statements);
}
const publicVariant = (v: Variant) => ({ id: v.id, productId: v.product_id, options: JSON.parse(v.options_json) as Record<string, string>, sku: v.sku, quantity: v.quantity, lowThreshold: v.low_threshold, configured: !!v.configured, active: !!v.active, version: v.version, updatedAt: v.updated_at, status: variantStatus(v) });
export function variantStatus(v: Variant) {
  return !v.active ? 'Archivado' : !v.configured ? 'Pendiente de configurar' : v.quantity === 0 ? 'Agotado' : v.low_threshold !== null && v.quantity <= v.low_threshold ? 'Stock bajo' : 'Disponible';
}
export async function inventorySnapshot() {
  const db = bindings().DB;
  const result = await db.batch([db.prepare('SELECT * FROM stock_products ORDER BY source_active DESC,id'), db.prepare('SELECT id,product_id,options_json,options_key,sku,quantity,low_threshold,configured,active,version,updated_at FROM stock_variants ORDER BY product_id,options_key')]);
  const refs = result[0].results as ProductRef[], variants = result[1].results as Variant[];
  const items = refs.map(ref => {
    const product = JSON.parse(ref.metadata) as ShopProduct;
    const own = variants.filter(v => v.product_id === ref.id), active = own.filter(v => v.active);
    const pending = !active.length || active.some(v => !v.configured);
    const quantity = active.reduce((sum, v) => sum + v.quantity, 0);
    const status = !ref.source_active ? 'Archivado' : pending ? 'Pendiente de configurar' : !quantity ? 'Agotado' : active.some(v => variantStatus(v) === 'Stock bajo') ? 'Stock bajo' : 'Disponible';
    return { id: ref.id, name: product.name, category: product.category, image: product.images[0] || null, active: !!ref.source_active, quantity, status, variants: own.map(publicVariant), updatedAt: own.map(v => v.updated_at).sort().at(-1) || ref.updated_at };
  });
  const activeVariants = variants.filter(v => v.active && refs.some(p => p.id === v.product_id && p.source_active));
  return { items, summary: { products: items.filter(p => p.active).length, units: activeVariants.reduce((sum, v) => sum + v.quantity, 0), empty: activeVariants.filter(v => v.configured && !v.quantity).length, low: activeVariants.filter(v => variantStatus(v) === 'Stock bajo').length } };
}
export async function findVariant(id: string) {
  const row = await bindings().DB.prepare('SELECT * FROM stock_variants WHERE id=?').bind(id).first<Variant>();
  if (!row) throw new StockError('Variante no encontrada.', 404);
  return row;
}
export async function requireProduct(id: string) {
  const row = await bindings().DB.prepare('SELECT * FROM stock_products WHERE id=? AND source_active=1').bind(id).first<ProductRef>();
  if (!row) throw new StockError('Producto no encontrado o archivado.', 404);
  return row;
}
export async function saveVariant(productId: string, value: Record<string, unknown>) {
  await requireProduct(productId);
  const db = bindings().DB, normalized = normalizeOptions(value.options);
  const sku = text(value.sku ?? '', 60);
  const threshold = value.lowThreshold == null || value.lowThreshold === '' ? null : integer(value.lowThreshold);
  if (value.active !== undefined && typeof value.active !== 'boolean') throw new StockError('Estado no válido.');
  if (value.id) {
    const id = text(value.id, 100, true), current = await findVariant(id);
    if (current.product_id !== productId) throw new StockError('Variante no válida.', 404);
    const active = value.active === false ? 0 : 1;
    // A simple product is represented by options {}, and cannot coexist actively with sized variants.
    const conflict = await db.prepare(`SELECT id FROM stock_variants WHERE product_id=? AND active=1 AND id<>? AND (options_key='{}' OR ?='{}')`).bind(productId, id, normalized.key).first();
    if (active && conflict) throw new StockError('Archiva la variante sin opciones antes de activar tallas, o archiva las tallas antes de activar la variante sin opciones.', 409);
    const result = await db.prepare(`UPDATE stock_variants SET options_json=?,options_key=?,sku=?,low_threshold=?,active=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?`).bind(JSON.stringify(normalized.options), normalized.key, sku, threshold, active, id, integer(value.version, 1)).run();
    if (!result.meta.changes) throw new StockError('Otra persona ha modificado esta variante. Actualiza antes de guardar.', 409);
    return publicVariant(await findVariant(id));
  }
  const current = (await db.prepare('SELECT * FROM stock_variants WHERE product_id=? AND active=1').bind(productId).all<Variant>()).results;
  const simple = current.find(v => v.options_key === '{}');
  if (normalized.key === '{}' && current.length) throw new StockError('Ya hay variantes activas para este producto.', 409);
  if (simple && normalized.key !== '{}' && simple.quantity !== 0) throw new StockError('Recuenta y registra la salida del stock sin tallas antes de repartirlo entre variantes.', 409);
  const id = crypto.randomUUID();
  // The guard below also checks at write time: a concurrent movement cannot lose its stock.
  const guard = simple && normalized.key !== '{}' ? `AND EXISTS(SELECT 1 FROM stock_variants WHERE id=? AND quantity=0 AND active=0 AND version=?)` : '';
  const insert = db.prepare(`INSERT INTO stock_variants(id,product_id,options_json,options_key,sku,low_threshold)
    SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM stock_products WHERE id=? AND source_active=1) ${guard}`);
  const params = [id, productId, JSON.stringify(normalized.options), normalized.key, sku, threshold, productId, ...(simple && normalized.key !== '{}' ? [simple.id, simple.version + 1] : [])];
  const batch = [];
  if (simple && normalized.key !== '{}') batch.push(db.prepare(`UPDATE stock_variants SET active=0,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND quantity=0 AND version=? AND active=1`).bind(simple.id, simple.version));
  batch.push(insert.bind(...params));
  const result = await db.batch(batch);
  if (!result.at(-1)!.meta.changes) throw new StockError('El stock ha cambiado. Actualiza antes de añadir la variante.', 409);
  return publicVariant(await findVariant(id));
}
export async function recordMovement(id: string, value: Record<string, unknown>, actor: string) {
  const current = await findVariant(id); await requireProduct(current.product_id);
  const kind = value.kind;
  if (!['entry','exit','adjust'].includes(String(kind))) throw new StockError('Movimiento no válido.');
  const amount = integer(value.amount, kind === 'adjust' ? 0 : 1), version = integer(value.version, 1);
  const reason = text(value.reason, 180, true), note = text(value.note ?? '', 1000);
  const operationId = text(value.operationId, 36, true);
  if (!/^[a-f0-9-]{36}$/.test(operationId)) throw new StockError('Referencia de operación no válida.');
  const hash = await digest(JSON.stringify({ id, kind, amount, version, reason, note, actor }));
  const existing = () => bindings().DB.prepare('SELECT * FROM stock_movements WHERE id=?').bind(operationId).first<Movement>();
  const prior = await existing();
  if (prior) { if (prior.request_hash !== hash) throw new StockError('Referencia de operación ya utilizada.', 409); return prior; }
  // Increment/decrement expressions operate on the stored value, never on a client-supplied balance.
  const expression = kind === 'entry' ? 'quantity+?' : kind === 'exit' ? 'quantity-?' : '?';
  const result = await bindings().DB.prepare(`UPDATE stock_variants SET quantity=${expression},configured=1,version=version+1,updated_at=CURRENT_TIMESTAMP,
    operation_id=?,operation_kind=?,operation_reason=?,operation_note=?,operation_actor=?,operation_hash=?
    WHERE id=? AND version=? AND active=1 AND ${expression} BETWEEN 0 AND 1000000
    AND EXISTS(SELECT 1 FROM stock_products WHERE id=stock_variants.product_id AND source_active=1)`)
    .bind(amount, operationId, kind, reason, note, actor, hash, id, version, amount).run();
  if (!result.meta.changes) {
    const retry = await existing(); if (retry?.request_hash === hash) return retry;
    const latest = await findVariant(id);
    if (latest.version !== version) throw new StockError('Otra persona ha modificado el stock. Actualiza y revisa el recuento antes de guardar.', 409);
    if (!latest.active) throw new StockError('Esta variante está archivada.', 409);
    throw new StockError('La operación dejaría un stock negativo o superior al límite.');
  }
  return (await existing())!;
}
export async function history(productId: string, page = 0) {
  // Bounded pagination prevents sending an unbounded private history to the browser.
  return (await bindings().DB.prepare('SELECT m.* FROM stock_movements m JOIN stock_variants v ON v.id=m.variant_id WHERE v.product_id=? ORDER BY m.created_at DESC,m.rowid DESC LIMIT 100 OFFSET ?').bind(productId, integer(page) * 100).all<Movement>()).results;
}
export async function publicAvailability() {
  const snapshot = await inventorySnapshot();
  return { items: snapshot.items.filter(p => p.active).map(p => ({ id: p.id, status: p.status === 'Stock bajo' ? 'Disponible' : p.status === 'Pendiente de configurar' ? 'Consultar disponibilidad' : p.status,
    variants: p.variants.filter(v => v.active && Object.keys(v.options).length).map(v => ({ options: v.options, status: v.status === 'Stock bajo' ? 'Disponible' : v.status === 'Pendiente de configurar' ? 'Consultar disponibilidad' : v.status })) })) };
}

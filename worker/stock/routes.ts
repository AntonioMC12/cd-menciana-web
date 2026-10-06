import { bindings, csrfToken } from '../../src/lib/cms';
import { STOCK_ROOT, StockError, stockJson, secureRequest, requireStockAccess } from './auth';
import { syncInventory, inventorySnapshot, history, saveVariant, recordMovement, publicAvailability } from './inventory';
import { accessPage, stockPage, stockResponse, stockJsonResponse } from './page';
import stockCss from './style.css.txt';
import stockJs from './client.txt';
export async function stockRoutes(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, ''), method = request.method;
  // Keep authentication and session cookies on the CMS origin.
  if (url.hostname === 'cdmenciana.es' && (path === STOCK_ROOT || path.startsWith(`${STOCK_ROOT}/`)) && ['GET','HEAD'].includes(method)) {
    return new Response(null,{status:302,headers:{location:`https://cms.cdmenciana.es${url.pathname}${url.search}`,'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  }
  if (path === '/api/shop/availability' && method === 'GET') {
    try { return stockJsonResponse(await publicAvailability()); }
    catch { return stockJsonResponse({ error: 'Disponibilidad no disponible. Consulta con el club.' }, 503); }
  }
  if (path !== STOCK_ROOT && !path.startsWith(`${STOCK_ROOT}/`)) return null;
  try {
    if (!secureRequest(request)) throw new StockError('El acceso privado requiere HTTPS.',503);
    if (path === `${STOCK_ROOT}/style.css` && method === 'GET') return stockResponse(stockCss.replaceAll('__WEB_ORIGIN__',new URL(bindings().PUBLIC_WEB_ORIGIN || 'https://cdmenciana.es').origin),'text/css; charset=utf-8');
    const actor = await requireStockAccess(request, !['GET','HEAD'].includes(method));
    if (path === STOCK_ROOT && method === 'GET') return stockResponse(stockPage(await csrfToken(actor),actor),'text/html; charset=utf-8');
    if (path === `${STOCK_ROOT}/client.js` && method === 'GET') return stockResponse(stockJs,'text/javascript; charset=utf-8');
    if (path === `${STOCK_ROOT}/logout` && method === 'POST') return stockJsonResponse({redirect:'/cdn-cgi/access/logout'});
    if (path === `${STOCK_ROOT}/api/inventory` && method === 'GET') { await syncInventory(); return stockJsonResponse(await inventorySnapshot()); }
    const productMatch = path.match(/^\/tienda\/stock\/api\/products\/([a-z0-9-]+)\/(variants|history)$/);
    if (productMatch && productMatch[2] === 'history' && method === 'GET') return stockJsonResponse({items:await history(productMatch[1],Number(new URL(request.url).searchParams.get('page') || 0))});
    if (productMatch && productMatch[2] === 'variants' && method === 'POST') return stockJsonResponse(await saveVariant(productMatch[1],await stockJson(request)),201);
    const movementMatch = path.match(/^\/tienda\/stock\/api\/variants\/([a-f0-9-]{36})\/movements$/);
    if (movementMatch && method === 'POST') return stockJsonResponse(await recordMovement(movementMatch[1],await stockJson(request),actor),201);
    return stockJsonResponse({error:'Ruta o método no disponible.'},404);
  } catch (cause) {
    if (cause instanceof StockError) return path === STOCK_ROOT && method === 'GET'
      ? stockResponse(accessPage(cause.message),'text/html; charset=utf-8',cause.status)
      : stockJsonResponse({error:cause.message},cause.status);
    if (cause instanceof Error && cause.message.includes('UNIQUE constraint')) return stockJsonResponse({error:'Ya existe una variante con esas opciones o referencia. Revisa también las archivadas.'},409);
    if (cause instanceof Error && cause.message.includes('simple_variant_conflict')) return stockJsonResponse({error:'El producto ha cambiado. Actualiza las variantes antes de guardar.'},409);
    console.error('stock_request_failed');
    return stockJsonResponse({error:'No se pudo completar la operación. Comprueba la conexión y la configuración del inventario.'},503);
  }
}

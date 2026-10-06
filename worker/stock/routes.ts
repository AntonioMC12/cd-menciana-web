import { bindings } from '../../src/lib/cms';
import { STOCK_ROOT, StockError, createSession, session, sessionCookie, login, checkCsrf, stockJson, secureRequest, requireStockAccess } from './auth';
import { syncInventory, inventorySnapshot, history, saveVariant, recordMovement, publicAvailability } from './inventory';
import { loginPage, stockPage, stockResponse, stockJsonResponse } from './page';
import stockCss from './style.css.txt';
import stockJs from './client.txt';
export async function stockRoutes(request: Request): Promise<Response | null> {
  const path = new URL(request.url).pathname.replace(/\/$/, ''), method = request.method;
  if (path === '/api/shop/availability' && method === 'GET') {
    try { return stockJsonResponse(await publicAvailability()); }
    catch { return stockJsonResponse({ error: 'Disponibilidad no disponible. Consulta con el club.' }, 503); }
  }
  if (path !== STOCK_ROOT && !path.startsWith(`${STOCK_ROOT}/`)) return null;
  try {
    if (!secureRequest(request)) throw new StockError('El acceso privado requiere HTTPS.',503);
    if (path === `${STOCK_ROOT}/style.css` && method === 'GET') return stockResponse(stockCss.replaceAll('__WEB_ORIGIN__',new URL(bindings().PUBLIC_WEB_ORIGIN || 'https://cdmenciana.es').origin),'text/css; charset=utf-8');
    await requireStockAccess(request);
    if (path === `${STOCK_ROOT}/login` && method === 'POST') {
      const prelogin = await session(request, 'login');
      if (!prelogin) throw new StockError('La pantalla de acceso ha caducado. Recárgala.',403);
      const data = await stockJson(new Request(request.url,{method:'POST',headers:request.headers,body:JSON.stringify(Object.fromEntries(new URLSearchParams(await limitedForm(request))))}));
      checkCsrf(request,prelogin, typeof data.csrf === 'string' ? data.csrf : null);
      try {
        const auth = await login(request,typeof data.password === 'string' ? data.password : '');
        await bindings().DB.prepare('DELETE FROM stock_sessions WHERE token_hash=?').bind(prelogin.token_hash).run();
        const response = stockResponse(null,'text/html',303,{location:STOCK_ROOT+'/', 'set-cookie':auth.cookie});
        response.headers.append('set-cookie',sessionCookie(request,'login','',0)); return response;
      } catch (cause) {
        if (!(cause instanceof StockError)) throw cause;
        return stockResponse(loginPage(prelogin.csrf,cause.message),'text/html; charset=utf-8',cause.status);
      }
    }
    const current = await session(request);
    if (path === STOCK_ROOT && method === 'GET') {
      if (!bindings().STOCK_PASSWORD_HASH) return stockResponse(loginPage('', 'El acceso todavía no está configurado. Contacta con la administración.'),'text/html; charset=utf-8',503);
      if (!current) {
        const initial = await createSession(request,'login');
        return stockResponse(loginPage(initial.csrf),'text/html; charset=utf-8',200,{'set-cookie':initial.cookie});
      }
      return stockResponse(stockPage(current.csrf,current.actor),'text/html; charset=utf-8');
    }
    if (!current) return stockJsonResponse({error:'Sesión no válida o caducada. Vuelve a entrar.'},401);
    if (path === `${STOCK_ROOT}/client.js` && method === 'GET') return stockResponse(stockJs,'text/javascript; charset=utf-8');
    if (method !== 'GET') checkCsrf(request,current,request.headers.get('x-cdm-csrf'));
    if (path === `${STOCK_ROOT}/logout` && method === 'POST') {
      await bindings().DB.prepare('DELETE FROM stock_sessions WHERE token_hash=?').bind(current.token_hash).run();
      return stockResponse('{}','application/json',200,{'set-cookie':sessionCookie(request,'app','',0)});
    }
    if (path === `${STOCK_ROOT}/api/inventory` && method === 'GET') { await syncInventory(); return stockJsonResponse(await inventorySnapshot()); }
    const productMatch = path.match(/^\/tienda\/stock\/api\/products\/([a-z0-9-]+)\/(variants|history)$/);
    if (productMatch && productMatch[2] === 'history' && method === 'GET') return stockJsonResponse({items:await history(productMatch[1],Number(new URL(request.url).searchParams.get('page') || 0))});
    if (productMatch && productMatch[2] === 'variants' && method === 'POST') return stockJsonResponse(await saveVariant(productMatch[1],await stockJson(request)),201);
    const movementMatch = path.match(/^\/tienda\/stock\/api\/variants\/([a-f0-9-]{36})\/movements$/);
    if (movementMatch && method === 'POST') return stockJsonResponse(await recordMovement(movementMatch[1],await stockJson(request),current.actor),201);
    return stockJsonResponse({error:'Ruta o método no disponible.'},404);
  } catch (cause) {
    if (cause instanceof StockError) return path === STOCK_ROOT && method === 'GET'
      ? stockResponse(loginPage('',cause.message),'text/html; charset=utf-8',cause.status)
      : stockJsonResponse({error:cause.message},cause.status);
    if (cause instanceof Error && cause.message.includes('UNIQUE constraint')) return stockJsonResponse({error:'Ya existe una variante con esas opciones o referencia. Revisa también las archivadas.'},409);
    if (cause instanceof Error && cause.message.includes('simple_variant_conflict')) return stockJsonResponse({error:'El producto ha cambiado. Actualiza las variantes antes de guardar.'},409);
    console.error('stock_request_failed');
    return stockJsonResponse({error:'No se pudo completar la operación. Comprueba la conexión y la configuración del inventario.'},503);
  }
}
async function limitedForm(request: Request) {
  const reader = request.body?.getReader(); let value = '', size = 0;
  if (!reader) throw new StockError('Faltan datos.');
  const decoder = new TextDecoder();
  while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 4000) { await reader.cancel(); throw new StockError('Solicitud demasiado grande.',413); } value += decoder.decode(chunk.value,{stream:true}); }
  return value + decoder.decode();
}

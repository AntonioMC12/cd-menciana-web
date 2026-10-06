# Control privado de stock

Implementación en Astro + el Worker existente + D1. Publicación autorizada el 6 de octubre de 2026: migración aplicada en remoto, Worker publicado y catálogo sincronizado con 20 productos activos. El pantalón largo de chándal es único y común a todas las categorías; mantiene el identificador `chandal-primer-equipo-inferior`. El duplicado anterior se archiva si ya existía, conservando su historial.

El dominio principal pasa por el proxy de Cloudflare, autorizado por el propietario, con las mismas cuatro IP de GitHub Pages. Access sigue vinculado al Worker y mantiene su audiencia y política administrativa. Se añadió únicamente `/api/shop/availability` a las excepciones públicas; el inventario privado sigue protegido por Cloudflare Access.

La dirección canónica del panel es `https://cms.cdmenciana.es/tienda/stock/`. Una regla de redirección de Cloudflare lleva las peticiones de `/tienda/stock` y sus subrutas en el dominio principal al mismo camino en el CMS, conservando la consulta. Se ejecuta antes de Access para que el inicio de sesión y sus cookies correspondan al CMS. El Worker también devuelve la redirección como respaldo; no se entrega inventario privado desde el dominio principal.

## Arquitectura y catálogo

La tienda se genera como HTML estático; el panel privado lo sirve el Worker, nunca Astro ni GitHub Pages. La ruta preparada es `/tienda/stock/`, sin enlaces públicos, excluida del sitemap y con `noindex`, CSP y respuestas `private, no-store`.

El catálogo existente es `src/data/shop.ts`: el CMS actual gestiona noticias y álbumes, no productos. El inventario importa esos mismos productos e identificadores; no añade otro catálogo. Al consultar el panel y en el cron horario existente se sincronizan altas y cambios. Los productos nuevos empiezan con cero y «Pendiente de configurar». Para archivar un producto, marca `archived: true` en su entrada; retirarlo del catálogo también conserva su inventario como archivado. Conserva el identificador al editar nombres, fotos o textos.

`migrations/0004_inventory.sql` añade productos de referencia, variantes, movimientos, sesiones y límites de acceso sin borrar tablas existentes. Las variantes declaradas en el catálogo se inicializan por combinación. Desde el panel se pueden añadir otras opciones, editar SKU y umbral o archivar. El stock simple debe recontarse a cero antes de distribuirlo por variantes. Una variante archivada se puede reactivar; no se recrea automáticamente ni se pierde su historial. El total suma solo variantes activas.

Entradas, salidas y recuentos actualizan D1 con comprobación de versión. Un trigger inserta el historial en la misma operación: si falla, se revierte la existencia. Los reintentos usan un identificador de operación para evitar duplicados. Ante un conflicto, el formulario ofrece actualizar datos y revisar antes de guardar. Los movimientos guardan las opciones existentes en ese momento, aunque después se edite la variante. El historial admite bloques de 100 y filtros por tipo.

## Ejecutar y probar en local (PowerShell)

Desde la raíz del proyecto:

```powershell
npm run db:local
npm run build:worker
```

Para el desarrollo local, configura `.dev.vars` con `ENVIRONMENT=local`, `LOCAL_ADMIN_BYPASS=1` y `PUBLIC_WEB_ORIGIN=http://127.0.0.1:4321`. El bypass solo funciona en localhost con entorno local; nunca en producción. No pongas valores privados en variables `PUBLIC_*`.

En una terminal:

```powershell
$env:WRANGLER_LOG_PATH="$PWD/tmp/wrangler-dev-stock.log"
npx wrangler dev --config wrangler.jsonc --port 8788 --ip 127.0.0.1 --local-upstream 127.0.0.1:8788
```

En otra terminal:

```powershell
$env:PUBLIC_CMS_API_URL='http://127.0.0.1:8788'
node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 4321
```

Abre `http://127.0.0.1:8788/tienda/stock/` y la tienda en `http://127.0.0.1:4321/tienda/`. Usa el host indicado para que coincidan origen, cookies y CSRF. El panel no funciona en el servidor estático anterior del puerto 8771.

La migración ya se ha aplicado a D1 local y remoto. Las pruebas usan datos locales sin afectar a producción. Las tablas históricas de sesiones y límites de contraseña permanecen para evitar una migración destructiva, pero ya no se consultan ni autorizan ningún acceso.

## Cloudflare Access y mantenimiento en producción

Cloudflare Access es el único inicio de sesión del panel. Después del acceso autorizado al CMS, el inventario se abre directamente, sin otra contraseña ni cookies de sesión propias del stock. El Worker valida el JWT de Access, su firma, issuer, audiencia, caducidad y el correo administrativo autorizado. Sin identidad válida se rechazan tanto la página como sus endpoints privados. La configuración incompleta bloquea el acceso; la ausencia de configuración tampoco habilita un acceso público.

Se reutiliza la autorización del CMS: las modificaciones exigen origen coincidente y token CSRF, y tienen un límite de 60 solicitudes por identidad y minuto. HTTP solo se admite en localhost y entorno local. Cada movimiento conserva la identidad verificada en su historial. Cerrar sesión utiliza la ruta de Cloudflare `/cdn-cgi/access/logout`.

Mantener `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL` y `CSRF_SECRET` en el Worker, y la política de Access existente sobre el CMS y todos los endpoints privados de stock. El endpoint público de disponibilidad mantiene su excepción. El secreto `STOCK_PASSWORD_HASH` y su herramienta ya no son necesarios y se retiran; no trasladar `.dev.vars` a producción.

Para futuros cambios, aplicar las migraciones necesarias con `npm run db:remote`, compilar el cliente con `npm run build:worker` y publicar el Worker con el procedimiento existente. La web estática compila con `PUBLIC_CMS_API_URL=https://cms.cdmenciana.es`. La ruta del dominio principal y su redirección al CMS conservan la configuración existente.

## Tienda pública

`GET /api/shop/availability` en el Worker devuelve solamente identificadores de catálogo, opciones y textos de disponibilidad. No exporta unidades exactas, SKU, responsables, notas, historial ni sesiones. El stock bajo se presenta como «Disponible»; sin configuración se muestra «Consultar disponibilidad». La tienda consulta al cargar, al volver a la pestaña y cada 30 segundos mientras está visible, sin caché; tras una modificación recibe datos actuales en la siguiente consulta. Si la API falla conserva el mensaje de consulta con el club.

WhatsApp y las ventas en el pabellón mantienen su flujo. Abrir una consulta no reserva ni descuenta stock: el personal registra la venta o salida en el panel.

Las tarjetas y el detalle de producto muestran una etiqueta automática: «En stock» si todas las variantes públicas están disponibles; «En stock en algunas tallas» si solo parte tiene unidades (o «algunas opciones» si son colores u otras variantes); «Pendiente de pedido» si todas están configuradas y agotadas. Si falta configuración o falla la API, se muestra «Consultar disponibilidad». «Pendiente de pedido» describe la falta de existencias; no confirma que el club haya hecho un pedido al proveedor ni promete un plazo de entrega. No se muestran cantidades y las etiquetas se actualizan con la misma consulta periódica del catálogo.

## Archivos principales y comprobaciones

- `worker/stock/auth.ts`: validación obligatoria de Access y autorización reutilizada del CMS (CSRF y límites de escritura).
- `worker/stock/inventory.ts`: sincronización del catálogo, variantes, existencias e historial.
- `worker/stock/routes.ts`, `page.ts`, `style.css.txt` y `src/scripts/stock-admin.ts`: endpoints y panel responsive.
- `worker/index.ts`, `wrangler.jsonc`, `src/lib/cms.ts` y `scripts/build-worker.mjs`: integración con el Worker existente.
- `src/data/shop.ts`, `src/pages/tienda.astro`, `src/components/ShopProductCard.astro` y `src/scripts/shop.ts`: catálogo y disponibilidad pública.
- `package.json`, `.gitignore`, `astro.config.mjs` y `tsconfig.json`: configuración y herramientas.
- `tests/stock.test.ts`: SQLite real con la migración, constraints, transacciones y triggers.

Ejecuta `npm test`, `npm run build` y `npm run build:worker`. Las pruebas cubren altas automáticas, productos simples y combinaciones, conservación al editar/archivar, entradas/salidas/recuentos, rollback del historial, duplicados, cantidades inválidas, concurrencia, reintentos, paginación, disponibilidad sin datos privados, acceso directo sin contraseña, rechazo de identidades inválidas y cookies antiguas, CSRF, límites de escritura y bypass exclusivamente local. También se revisó el panel en navegador en ordenador, tablet y móvil, incluida persistencia real en D1 local y disponibilidad de la tienda.

Para una comprobación manual: acceder mediante Cloudflare Access y comprobar que se abre el panel directamente; abrir un producto, crear una talla, añadir unidades, registrar salida y recuento, revisar historial y tienda. Abrir dos pestañas y guardar un recuento antiguo debe producir un conflicto. Cerrar sesión debe llevar al logout de Cloudflare. Una petición sin JWT válido debe ser interceptada por Access o recibir 401 del Worker, sin existencias.

Revisión del 6 de octubre de 2026: 64 pruebas superadas en ocho archivos. Se mantienen las existencias y el historial de producción; este cambio no requiere migraciones ni modifica datos del inventario.

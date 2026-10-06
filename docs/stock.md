# Control privado de stock

Implementación en Astro + el Worker existente + D1. Publicación autorizada el 6 de octubre de 2026: migración aplicada en remoto, contraseña configurada como secreto, Worker publicado y catálogo sincronizado con 20 productos activos. El pantalón largo de chándal es único y común a todas las categorías; mantiene el identificador `chandal-primer-equipo-inferior`. El duplicado anterior se archiva si ya existía, conservando su historial.

El dominio principal pasa por el proxy de Cloudflare, autorizado por el propietario, con las mismas cuatro IP de GitHub Pages. Access sigue vinculado al Worker y mantiene su audiencia y política administrativa. Se añadió únicamente `/api/shop/availability` a las excepciones públicas; el inventario privado sigue protegido por Access y contraseña.

## Arquitectura y catálogo

La tienda se genera como HTML estático; el panel privado lo sirve el Worker, nunca Astro ni GitHub Pages. La ruta preparada es `/tienda/stock/`, sin enlaces públicos, excluida del sitemap y con `noindex`, CSP y respuestas `private, no-store`.

El catálogo existente es `src/data/shop.ts`: el CMS actual gestiona noticias y álbumes, no productos. El inventario importa esos mismos productos e identificadores; no añade otro catálogo. Al consultar el panel y en el cron horario existente se sincronizan altas y cambios. Los productos nuevos empiezan con cero y «Pendiente de configurar». Para archivar un producto, marca `archived: true` en su entrada; retirarlo del catálogo también conserva su inventario como archivado. Conserva el identificador al editar nombres, fotos o textos.

`migrations/0004_inventory.sql` añade productos de referencia, variantes, movimientos, sesiones y límites de acceso sin borrar tablas existentes. Las variantes declaradas en el catálogo se inicializan por combinación. Desde el panel se pueden añadir otras opciones, editar SKU y umbral o archivar. El stock simple debe recontarse a cero antes de distribuirlo por variantes. Una variante archivada se puede reactivar; no se recrea automáticamente ni se pierde su historial. El total suma solo variantes activas.

Entradas, salidas y recuentos actualizan D1 con comprobación de versión. Un trigger inserta el historial en la misma operación: si falla, se revierte la existencia. Los reintentos usan un identificador de operación para evitar duplicados. Ante un conflicto, el formulario ofrece actualizar datos y revisar antes de guardar. Los movimientos guardan las opciones existentes en ese momento, aunque después se edite la variante. El historial admite bloques de 100 y filtros por tipo.

## Ejecutar y probar en local (PowerShell)

Desde la raíz del proyecto:

```powershell
npm run db:local
node scripts/stock-password.mjs --local
npm run build:worker
```

El comando solicita una contraseña de al menos 12 caracteres sin mostrarla y guarda exclusivamente su hash en `.dev.vars`, ignorado por Git. Asegúrate de que ese archivo tenga `ENVIRONMENT=local` y `PUBLIC_WEB_ORIGIN=http://127.0.0.1:4321`. No pongas valores privados en variables `PUBLIC_*`.

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

La migración ya se ha aplicado a D1 local y remoto. La contraseña elegida por el propietario está configurada mediante hash en `.dev.vars` y en el secreto remoto `STOCK_PASSWORD_HASH`; su valor no se guarda en Git. Las pruebas del navegador registraron movimientos identificados como pruebas locales, sin afectar a producción.

## Contraseña, acceso y mantenimiento en producción

Se almacena un hash PBKDF2-SHA256 con sal aleatoria y 100.000 iteraciones, compatible con Web Crypto de Workers. No se guarda la contraseña en HTML, JavaScript o el repositorio. Las sesiones duran ocho horas, están en D1 y usan cookies `HttpOnly`, `SameSite=Strict` y `Secure` en HTTPS. Cerrar sesión revoca la sesión; cambiar el hash invalida las existentes. Las modificaciones requieren token CSRF y origen coincidente. El acceso limita a cinco intentos por IP en ventanas de 15 minutos. HTTP solo se permite en localhost con entorno local.

Cuando están configurados `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` y `ADMIN_EMAIL`, también se exige la identidad administrativa existente de Cloudflare Access para entrar y usar los endpoints. Una configuración parcial bloquea el acceso. La contraseña no sustituye esa identidad. El bypass local del CMS no evita la contraseña del panel.

Estos son los pasos de configuración y mantenimiento utilizados para la publicación. Para futuras modificaciones, aplicar solo los que correspondan:

1. Aplicar las migraciones a la D1 existente: `npm run db:remote`.
2. Ejecutar `node scripts/stock-password.mjs` en una terminal privada. Genera el hash en `tmp/stock-password-hash.txt`; configurarlo como secreto del Worker:

   ```powershell
   Get-Content -Raw -LiteralPath .\tmp\stock-password-hash.txt | npx wrangler secret put STOCK_PASSWORD_HASH --config wrangler.jsonc
   Remove-Item -LiteralPath .\tmp\stock-password-hash.txt
   ```

3. Mantener `PUBLIC_WEB_ORIGIN=https://cdmenciana.es`. Configurar la identidad administrativa existente completa y proteger `cdmenciana.es/tienda/stock*` con Cloudflare Access, incluido su login y sus endpoints. El audience debe corresponder al que valida el Worker. No proteger con Access el endpoint público de disponibilidad.
4. La ruta `cdmenciana.es/tienda/stock*` ya está preparada en `wrangler.jsonc`. Requiere que el dominio principal esté en la zona Cloudflare y su DNS pase por el proxy. El resto de la web sigue en su alojamiento estático. Verificar esto antes de publicar el Worker; la ruta por sí sola no configura DNS ni Access.
5. Publicar Worker y web con el procedimiento existente cuando se autorice. La web compila con `PUBLIC_CMS_API_URL=https://cms.cdmenciana.es`. No trasladar `.dev.vars` a producción: configurar cada secreto por separado.

## Tienda pública

`GET /api/shop/availability` en el Worker devuelve solamente identificadores de catálogo, opciones y textos de disponibilidad. No exporta unidades exactas, SKU, responsables, notas, historial ni sesiones. El stock bajo se presenta como «Disponible»; sin configuración se muestra «Consultar disponibilidad». La tienda consulta al cargar, al volver a la pestaña y cada 30 segundos mientras está visible, sin caché; tras una modificación recibe datos actuales en la siguiente consulta. Si la API falla conserva el mensaje de consulta con el club.

WhatsApp y las ventas en el pabellón mantienen su flujo. Abrir una consulta no reserva ni descuenta stock: el personal registra la venta o salida en el panel.

## Archivos principales y comprobaciones

- `worker/stock/auth.ts`: contraseña, sesiones, Access, CSRF y límite de intentos.
- `worker/stock/inventory.ts`: sincronización del catálogo, variantes, existencias e historial.
- `worker/stock/routes.ts`, `page.ts`, `style.css.txt` y `src/scripts/stock-admin.ts`: endpoints y panel responsive.
- `worker/index.ts`, `wrangler.jsonc`, `src/lib/cms.ts` y `scripts/build-worker.mjs`: integración con el Worker existente.
- `src/data/shop.ts`, `src/pages/tienda.astro`, `src/components/ShopProductCard.astro` y `src/scripts/shop.ts`: catálogo y disponibilidad pública.
- `scripts/stock-password.mjs`, `package.json`, `.gitignore`, `astro.config.mjs` y `tsconfig.json`: configuración y herramientas.
- `tests/stock.test.ts`: SQLite real con la migración, constraints, transacciones y triggers.

Ejecuta `npm test`, `npm run build` y `npm run build:worker`. Las pruebas cubren altas automáticas, productos simples y combinaciones, conservación al editar/archivar, entradas/salidas/recuentos, rollback del historial, duplicados, cantidades inválidas, concurrencia, reintentos, paginación, disponibilidad sin datos privados, sesiones, CSRF, rate limit y Access. También se revisó el panel en navegador en ordenador, tablet y móvil, incluida persistencia real en D1 local y disponibilidad de la tienda.

Para una comprobación manual: entrar, abrir un producto, crear una talla, añadir unidades, registrar salida y recuento, revisar historial y tienda. Abrir dos pestañas y guardar un recuento antiguo debe producir un conflicto. Cerrar sesión y acceder a `/tienda/stock/api/inventory` debe devolver 401 sin existencias. No se han probado credenciales ni rutas remotas.

Resultado de la revisión del 6 de octubre de 2026: 57 pruebas superadas en siete archivos; build de Astro con cero errores, avisos o hints; build del cliente Worker correcto. Comprobado en navegador el cambio público a «Agotado» tras un recuento, y por HTTP el 401 de inventario después de cerrar sesión. El catálogo local queda con 21 productos, cero unidades activas y pendiente de configurar; la talla QA se archivó y su historial se conserva.

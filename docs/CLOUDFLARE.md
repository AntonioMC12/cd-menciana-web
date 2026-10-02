# Activación de la web en Cloudflare

**Estado:** implementación y pruebas locales completadas. No se han creado recursos remotos, cambiado DNS ni desplegado el Worker. No fusionar la PR hasta preparar lo siguiente y validar el entorno remoto. La acción de GitHub solo comprueba el código.

## 1. Cuenta y dominio del club

Crear o seleccionar una cuenta Cloudflare controlada por el club. Añadir el dominio del club como zona y verificar DNS. Elegir el dominio público definitivo antes de compilar: `PUBLIC_SITE_URL=https://dominio-del-club.example` (sin subruta). Reservar el acceso administrativo a una dirección de correo compartida y controlada por el club, protegida con MFA. Mantener el sitio anterior hasta validar el nuevo.

## 2. D1 y R2

Ejecutar con una sesión Wrangler de la cuenta del club:

```sh
npx wrangler login
npx wrangler d1 create cd-menciana
npx wrangler r2 bucket create cd-menciana-photos
```

Copiar el `database_id` real que devuelve D1 a `wrangler.jsonc`; el UUID de ceros es deliberadamente inválido para producción. El bucket R2 debe seguir **privado**, sin dominio público ni `r2.dev`. Elegir R2 Standard. Para importación inicial de noticias no hay que hacer nada: los tres artículos anteriores permanecen como ejemplos en `src/data/site.ts`, etiquetados y fuera de D1. Esta decisión evita convertir contenido ficticio en noticias oficiales.

## 3. Migraciones

```sh
npm run db:remote
```

`migrations/0001_content.sql` crea publicaciones, álbumes, fotos, cola de borrado y contador de solicitudes. `0002_published_slugs.sql` separa la URL pública de la del borrador. Aplicar las migraciones antes del primer despliegue. En local: `npm run db:local`.

## 4. Cloudflare Access

En Zero Trust → Access → Applications, crear **una** aplicación Self-hosted con los tres patrones del mismo dominio: `/admin`, `/admin/*` y `/api/admin/*`. Crear una política Allow que incluya **solo el correo compartido autorizado**. No usar una regla de dominio de correo completo. Copiar el Audience Tag de esta aplicación a `ACCESS_AUD` y el dominio del equipo (`https://equipo.cloudflareaccess.com`) a `ACCESS_TEAM_DOMAIN`.

El Worker verifica en cada petición privada el JWT `Cf-Access-Jwt-Assertion`: firma mediante JWKS, emisor, audiencia, expiración y correo exacto. `/admin/media/*` queda dentro de `/admin/*` para previsualizaciones. `/media/*` solo entrega fotos que pertenecen a contenido publicado; las claves R2 nunca se exponen. Las mutaciones exigen token CSRF derivado de HMAC y Origin del mismo sitio. Si Access o sus secretos faltan, la autorización falla cerrada. El modo `LOCAL_ADMIN_BYPASS=1` exige también compilación de desarrollo, `ENVIRONMENT=local` y hostname localhost/127.0.0.1; no sirve en producción.

## 5. Secretos y compilación

Establecer los secretos del Worker **sin guardarlos en Git**:

```sh
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put CSRF_SECRET
```

Generar `CSRF_SECRET` aleatorio, de al menos 32 caracteres. No configurar `LOCAL_ADMIN_BYPASS` ni `ENVIRONMENT=local` en producción. Compilar con `PUBLIC_SITE_URL` igual al dominio real; de otro modo las etiquetas canónicas y los sitemaps apuntarán a localhost. La configuración actual no incluye KV ni Cloudflare Images; las imágenes se comprimen en el navegador y se guardan en R2.

## 6. Desarrollo local

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
npm run check
npm test
npm run build
node scripts/local-smoke.mjs
```

En Windows, usar `Copy-Item .dev.vars.example .dev.vars`. Abrir `http://localhost:4321/admin/`. El bypass local explícito solo existe en `.dev.vars`, que está ignorado por Git. La prueba `local-smoke.mjs` usa `127.0.0.1:4321`; si se usa otro puerto, pasarlo como argumento. Crea y retira datos solo del D1/R2 local. No ejecutar contra una web remota.

## 7. Despliegue y dominio

Después de revisar la configuración, migraciones, Access y secretos, y **solo con autorización del club**:

```sh
npm run build
npm run deploy
```

Wrangler usa la configuración generada por el adaptador (`dist/server/wrangler.json`) y sube `dist/client` como assets. `wrangler deploy --dry-run` permite verificar el paquete sin publicarlo. Conectar el dominio al Worker en la cuenta Cloudflare, mantener la aplicación Access en los patrones indicados y revisar las rutas públicas. Desactivar GitHub Pages o retirar su dominio antiguo cuando la nueva web esté validada. La PR no despliega automáticamente.

## 8. Copias y restauración

Exportar D1 antes de cambios de esquema y periódicamente:

```sh
npx wrangler d1 export cd-menciana --remote --output=backup-cd-menciana.sql
```

Guardar el SQL y una copia del bucket R2 en un lugar seguro y cifrado fuera de la cuenta. Para R2, configurar `rclone` con el endpoint S3 de la cuenta y un token limitado al bucket; luego usar `rclone copy r2:cd-menciana-photos ./backup-r2` y verificar el número de objetos. **No usar `sync` sin revisar antes su efecto de borrado.** Restaurar en recursos nuevos de prueba: `npx wrangler d1 execute NOMBRE_NUEVO --remote --file=backup-cd-menciana.sql` y `rclone copy ./backup-r2 r2:NUEVO_BUCKET`. Validar noticias, fotos y permisos antes de cambiar bindings. Proteger los archivos de copia y las claves R2.

## Límites, limpieza y caché

- Entrada: JPG, PNG o WebP de hasta 20 MB y 12.000 px por lado; no SVG. El navegador genera WebP de hasta 2.000 px y miniatura de hasta 480 px, sin ampliar. La API verifica la firma WebP y dimensiones, limita la foto web a 2,5 MB, la miniatura a 400 kB, 20 fotos por álbum y el formulario a 4 MB. Las subidas van secuencialmente y ofrecen reintento.
- Mutaciones: máximo de 60 solicitudes por minuto e identidad. La cola de objetos pendientes se puede procesar con `POST /api/admin/cleanup` desde una sesión Access autenticada y con el token CSRF del panel. Ejecutarla tras retiradas o periódicamente; si R2 falla, conserva la tarea para reintentar. Las fotos de borradores abandonados requieren que el administrador elimine el álbum.
- El Worker comprueba que existen los dos objetos R2 antes de publicar un álbum o una portada. Si D1 falla al guardar la subida, elimina los dos objetos nuevos. D1 y R2 no ofrecen transacción conjunta; una eliminación fallida puede dejar objetos privados pendientes en la cola. Las imágenes públicas y páginas dinámicas usan `Cache-Control: no-store`, así que al retirar contenido el Worker deja de servirlo sin purga. Los assets de compilación sí pueden tener caché.
- Medir en la cuenta real peticiones, CPU, lecturas/escrituras D1 y operaciones/almacenamiento R2 durante una prueba de carga representativa antes de concluir que Workers Free basta. Si el tráfico supera sus límites, reducir consultas, ajustar la carga o evaluar Workers Paid con aprobación del club. No se usa servicio de transformación de imágenes.

Referencias: [Astro Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/), [validación de JWT de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [comandos D1](https://developers.cloudflare.com/d1/wrangler-commands/), [rclone para R2](https://developers.cloudflare.com/r2/examples/rclone/), [límites Workers](https://developers.cloudflare.com/workers/platform/limits/).

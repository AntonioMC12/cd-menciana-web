# Web en GitHub Pages y servicios en Cloudflare

**Estado:** el código está preparado y probado localmente. No se han creado D1 ni R2 remotos, no se ha desplegado el Worker ni se ha cambiado el alojamiento público. La web sigue en GitHub Pages.

## Arquitectura

| Servicio | Alojamiento | Dirección prevista |
| --- | --- | --- |
| Web pública Astro | GitHub Pages | `https://antoniomc12.github.io/cd-menciana-web/` |
| Panel editorial y API | Cloudflare Worker | `https://cd-menciana-cms.<subdominio>.workers.dev/admin/` |
| Base de datos | Cloudflare D1 | Binding privado `DB` |
| Fotografías | Cloudflare R2 | Bucket privado `PHOTOS` |

La portada, noticias y galerías consultan la API pública del Worker en el navegador. Al publicar o retirar contenido en el panel, la API y las fotos reflejan el cambio sin reconstruir GitHub Pages. Las páginas institucionales y los artículos de muestra siguen siendo HTML estático. La web pública no contiene el código del panel.

**Límite de GitHub Pages:** cada noticia y galería real usa una página estática compartida (`/noticias/detalle/?slug=…` o `/galerias/detalle/?slug=…`) que obtiene el contenido en el navegador. El título y la etiqueta canónica se actualizan con JavaScript, pero las vistas previas de redes sociales y los buscadores que no ejecuten JavaScript verán los metadatos genéricos. Si el club necesita SEO completo por publicación, habrá que generar HTML estático en cada publicación o mover esas páginas a un servidor dinámico.

## Preparar Cloudflare

1. Entrar en una cuenta Cloudflare controlada por el club y crear D1 y R2:

   ```sh
   npx wrangler login
   npx wrangler d1 create cd-menciana
   npx wrangler r2 bucket create cd-menciana-photos
   ```

2. Copiar el `database_id` real a `wrangler.jsonc`. El UUID de ceros es un marcador y no sirve para producción. Mantener R2 privado, sin dominio público ni `r2.dev`.
3. Ejecutar `npm run db:remote` para aplicar `migrations/`.
4. Crear una aplicación Cloudflare Access Self-hosted en el **dominio del Worker** para `/admin`, `/admin/*` y `/api/admin/*`. La política Allow debe incluir solo el correo autorizado, protegido con MFA. No abrir el acceso a un dominio completo de correo.
5. Crear secretos del Worker con `npx wrangler secret put NOMBRE --config wrangler.jsonc` para `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL` y `CSRF_SECRET`. `CSRF_SECRET` debe ser aleatorio y tener al menos 32 caracteres. No configurar `LOCAL_ADMIN_BYPASS` ni `ENVIRONMENT=local` en remoto.
6. Confirmar que `PUBLIC_WEB_ORIGIN` de `wrangler.jsonc` es `https://antoniomc12.github.io`. La API pública solo permite peticiones CORS desde ese origen; la API privada permanece en el origen del Worker.
7. Con la configuración revisada, ejecutar `npm run deploy:worker`. Este comando no despliega la web pública.

El Worker verifica firma, emisor, audiencia, expiración y correo exacto del JWT de Access en cada petición privada. También exige Origin del mismo Worker y token CSRF en las mutaciones. `/media/*` solo entrega fotos publicadas; `/admin/media/*` exige sesión. Si faltan credenciales de Access, el panel y la API privada deniegan el acceso.

## Conectar GitHub Pages

Después de obtener la URL real del Worker, crear en el repositorio GitHub la variable de Actions **`PUBLIC_CMS_API_URL`** con su origen, por ejemplo `https://cd-menciana-cms.mi-cuenta.workers.dev`, sin `/` final. El workflow `.github/workflows/deploy.yml` compila y publica Astro en GitHub Pages cuando se actualiza `main`. También puede ejecutarse manualmente para incorporar la variable. En Settings → Pages, seleccionar **GitHub Actions** como origen de publicación.

El sitio conserva `PUBLIC_SITE_URL=https://antoniomc12.github.io` y `PUBLIC_SITE_BASE=/cd-menciana-web`. Si se conecta un dominio propio en GitHub Pages, actualizar esas variables de compilación y `PUBLIC_WEB_ORIGIN` del Worker con el nuevo origen. No redirigir el dominio público al Worker.

## Desarrollo local

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:local
npm run dev:worker
```

En otra terminal:

```powershell
$env:PUBLIC_CMS_API_URL='http://127.0.0.1:8787'
npm run dev -- --host 127.0.0.1
```

Web: `http://127.0.0.1:4321/cd-menciana-web/`. Panel: `http://127.0.0.1:8787/admin/`. `.dev.vars` debe contener `PUBLIC_WEB_ORIGIN=http://127.0.0.1:4321`; está ignorado por Git. El bypass local requiere simultáneamente `ENVIRONMENT=local`, `LOCAL_ADMIN_BYPASS=1` y hostname `localhost` o `127.0.0.1`. Ejecutar `node scripts/local-smoke.mjs` solo contra el Worker local; crea y borra contenido de prueba en D1/R2 locales.

## Copias y operación

Antes de cambiar el esquema y de forma periódica, exportar D1 con `npx wrangler d1 export cd-menciana --remote --output=backup-cd-menciana.sql --config wrangler.jsonc`. Guardar ese SQL y una copia cifrada del bucket R2 fuera de Cloudflare. Para R2 puede utilizarse `rclone` con un token limitado al bucket; comprobar el número de objetos tras copiar. Probar la restauración en recursos nuevos antes de depender de las copias.

Las imágenes se comprimen en el navegador. La API admite hasta 20 fotos por álbum, valida WebP, limita el tamaño y solo publica objetos presentes en R2. Las mutaciones se limitan a 60 peticiones por minuto e identidad. Si una eliminación de R2 falla, la tarea queda en cola y puede reintentarse desde `POST /api/admin/cleanup` con sesión y CSRF. La API pública y las imágenes usan `Cache-Control: no-store` para reflejar retiradas sin purga de caché.

Referencias: [GitHub Pages con Astro](https://docs.astro.build/en/guides/deploy/github/), [Workers y CORS](https://developers.cloudflare.com/workers/examples/cors-header-proxy/), [validación JWT de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [D1 con Wrangler](https://developers.cloudflare.com/d1/wrangler-commands/), [R2 con rclone](https://developers.cloudflare.com/r2/examples/rclone/).

# Web en GitHub Pages y servicios en Cloudflare

**Estado:** D1 y el bucket R2 están creados, el Worker está desplegado en `cms.cdmenciana.es`, Access protege sus rutas privadas y la web pública se despliega con GitHub Pages.

Para comprar un dominio propio y conectar GitHub Pages con Cloudflare desde cero, sigue la [guía paso a paso de dominio y servicios](DOMINIO-Y-CLOUDFLARE.md). Las opciones elegidas son `cdmenciana.es` y, como alternativa, `cdmenciana.com`.

## Arquitectura

| Servicio | Alojamiento | Dirección prevista |
| --- | --- | --- |
| Web pública Astro | GitHub Pages | `https://cdmenciana.es/` |
| Panel editorial y API | Cloudflare Worker | `https://cms.cdmenciana.es/admin/` |
| Base de datos | Cloudflare D1 | Binding privado `DB` |
| Fotografías | Cloudflare R2 | Bucket privado `PHOTOS` |

Las noticias y galerías se obtienen de la API durante la compilación de Astro y se publican como HTML estático en GitHub Pages. El calendario consulta la API deportiva en el navegador. El Worker sincroniza cada hora los datos deportivos de la RFAF y conserva en D1 la última consulta válida. La web pública no contiene el código del panel.

Cada noticia y galería tiene su propia URL, HTML y metadatos para buscadores y redes sociales. Publicar o retirar contenido actualiza la API inmediatamente; para reflejarlo en GitHub Pages debe terminar un nuevo despliegue. El panel solicita ese despliegue automáticamente si está configurado el secreto descrito debajo, e informa si GitHub lo acepta o falla. No confirma que el despliegue haya terminado.

## Preparar Cloudflare

1. La cuenta de Cloudflare ya tiene D1 y R2. Para comprobarlo:

   ```sh
   npx wrangler login
   npx wrangler d1 list
   npx wrangler r2 bucket list
   ```

2. El `database_id` real ya figura en `wrangler.jsonc`. Mantener R2 privado, sin dominio público ni `r2.dev`.
3. Las migraciones actuales ya están aplicadas. Ejecutar `npm run db:remote` para aplicar futuras migraciones.
4. La aplicación Cloudflare Access Self-hosted **CD Menciana CMS** protege directamente al Worker. Solo `/`, `/api/posts`, `/api/posts/*`, `/api/albums`, `/api/albums/*`, `/api/sports` y `/media/*` tienen excepción pública. La política Allow incluye un único correo administrador y usa el proveedor de código de un solo uso por correo. No abrir el acceso a un dominio completo de correo.
5. Los secretos `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL` y `CSRF_SECRET` ya están configurados en el Worker. `CSRF_SECRET` es aleatorio y no se guarda en Git. No configurar `LOCAL_ADMIN_BYPASS` ni `ENVIRONMENT=local` en remoto.
6. Confirmar que `PUBLIC_WEB_ORIGIN` de `wrangler.jsonc` es `https://cdmenciana.es`. La API pública solo permite peticiones CORS desde ese origen; la API privada permanece en el origen del Worker.
7. Con la configuración revisada, ejecutar `npm run deploy:worker`. Este comando no despliega la web pública.

El Worker verifica firma, emisor, audiencia, expiración y correo exacto del JWT de Access en cada petición privada. También exige Origin del mismo Worker y token CSRF en las mutaciones. `/media/*` solo entrega fotos publicadas; `/admin/media/*` exige sesión. Si faltan credenciales de Access, el panel y la API privada deniegan el acceso.

## Conectar GitHub Pages

El workflow `.github/workflows/deploy.yml` ya compila Astro para `https://cdmenciana.es/` con la API en `https://cms.cdmenciana.es`. Publica GitHub Pages al actualizar `main`; también puede ejecutarse manualmente. En Settings → Pages, seleccionar **GitHub Actions** como origen de publicación. No redirigir el dominio público al Worker.

### Actualización automática desde el panel

1. Crear un [token personal de acceso detallado de GitHub](https://github.com/settings/personal-access-tokens/new) para el propietario `AntonioMC12`, limitado al repositorio `cd-menciana-web`, con permiso **Actions: Read and write**. Elegir caducidad y renovarlo antes de que expire. No necesita permiso de escritura de contenido.
2. Guardarlo como secreto **GITHUB_DEPLOY_TOKEN** del Worker `cd-menciana-cms` en Cloudflare → Workers & Pages → Settings → Variables and Secrets (tipo Secret), o con `npx wrangler secret put GITHUB_DEPLOY_TOKEN --config wrangler.jsonc`. No pegar el token en el chat, archivos versionados ni variables públicas.
3. Desplegar el código actualizado con `npm run deploy:worker`.
4. Publicar una noticia o galería desde el panel: debe indicar «Actualización de la web solicitada». Comprobar la ejecución `workflow_dispatch` en [GitHub Actions](https://github.com/AntonioMC12/cd-menciana-web/actions/workflows/deploy.yml) y después la URL pública. Retirar contenido también solicita el despliegue; guardar borradores no lo solicita.

La petición a GitHub tiene un límite de diez segundos. Si falla, el contenido permanece publicado o retirado en el CMS y el panel informa del problema; puede repetirse la acción o ejecutar el workflow manualmente. La ejecución programada cada seis horas sigue como respaldo. Los despliegues se serializan y se conserva la última solicitud pendiente para incorporar las publicaciones más recientes. Hasta que termine la reconstrucción, el HTML público anterior puede seguir visible, incluso después de retirar contenido.

Referencia: [API oficial de GitHub para solicitar un workflow](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event).

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

Web: `http://127.0.0.1:4321/`. Panel: `http://127.0.0.1:8787/admin/`. `.dev.vars` debe contener `PUBLIC_WEB_ORIGIN=http://127.0.0.1:4321`; está ignorado por Git. El bypass local requiere simultáneamente `ENVIRONMENT=local`, `LOCAL_ADMIN_BYPASS=1` y hostname `localhost` o `127.0.0.1`. Ejecutar `node scripts/local-smoke.mjs` solo contra el Worker local; crea y borra contenido de prueba en D1/R2 locales.

## Copias y operación

Antes de cambiar el esquema y de forma periódica, exportar D1 con `npx wrangler d1 export cd-menciana --remote --output=backup-cd-menciana.sql --config wrangler.jsonc`. Guardar ese SQL y una copia cifrada del bucket R2 fuera de Cloudflare. Para R2 puede utilizarse `rclone` con un token limitado al bucket; comprobar el número de objetos tras copiar. Probar la restauración en recursos nuevos antes de depender de las copias.

Las imágenes se comprimen en el navegador. La API admite hasta 20 fotos por álbum, valida WebP, limita el tamaño y solo publica objetos presentes en R2. Las mutaciones se limitan a 60 peticiones por minuto e identidad. Si una eliminación de R2 falla, la tarea queda en cola y puede reintentarse desde `POST /api/admin/cleanup` con sesión y CSRF. La API pública y las imágenes usan `Cache-Control: no-store` para reflejar retiradas sin purga de caché.

La sincronización deportiva consulta todas las jornadas de cada competición: 30 del primer equipo, 14 del filial, 14 del cadete y 18 del infantil. Se muestran únicamente los encuentros que publica la RFAF, conservando las horas pendientes y omitiendo descansos. El cron `0,15,30,45 * * * *` reparte las categorías entre cuatro ejecuciones: primer equipo en el minuto 0, filial en el 15, cadete en el 30 e infantil en el 45; cada categoría se actualiza cada hora. Se consultan cuatro jornadas a la vez, sin acumular todas las competiciones en una sola ejecución.

Solo consulta páginas públicas de la RFAF, valida que la clasificación y los partidos estén completos y sustituye la instantánea en D1 cuando toda la consulta termina bien. `GET /api/sports` sirve esa copia; también completa automáticamente una copia antigua que aún no tenga `roundsChecked` con todas las jornadas. Si falla una sincronización, el Worker registra el error y la web conserva la última información disponible. Revisar los logs del Worker y la fecha visible en `/calendario/` si no se actualiza. Un mes vacío significa que no hay partidos publicados en la copia disponible; no se calculan fechas ni rivales por extrapolación.

Referencias: [GitHub Pages con Astro](https://docs.astro.build/en/guides/deploy/github/), [Workers y CORS](https://developers.cloudflare.com/workers/examples/cors-header-proxy/), [validación JWT de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [D1 con Wrangler](https://developers.cloudflare.com/d1/wrangler-commands/), [R2 con rclone](https://developers.cloudflare.com/r2/examples/rclone/).


### Calendario completo clásico de la RFAF

El enlace NFG_VisCalendario_Vis de temporada 22 publica el calendario completo en una sola página. Se consulta para cada competición; se exige la temporada 2026-2027 y todas las jornadas. Se omiten descansos y se marcan sus fechas generales con dateIsRound=true. Los horarios, resultados y pabellones verificados en Novanet/D1 se conservan cuando coinciden jornada y ambos equipos. No se ejecutan los scripts de marcadores del sitio clásico.

Copia pública verificada desde el navegador el 6 de octubre de 2026: src/data/season-calendars.json. Primer equipo: 30 partidos, septiembre 2026 a abril 2027; filial: 14, octubre a febrero; cadete: 12 partidos y dos descansos en 14 jornadas, septiembre a febrero; infantil: 18, septiembre a marzo. Si la descarga automática del sitio clásico devuelve la página «No se ha aceptado el cookie», se conserva el último calendario completo válido o esta copia verificada. La clasificación conserva su propia fecha en standingsUpdatedAt cuando Novanet no está disponible.

Fuentes:
- primer-equipo: https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=48466108&codgrupo=48466109&CodJornada=
- filial: https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=49113015&codgrupo=49113036&CodJornada=
- cadete: https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=49465203&codgrupo=49465413&CodJornada=
- infantil: https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=22&codcompeticion=49520234&codgrupo=49520774&CodJornada=

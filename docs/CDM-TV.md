# CDM TV

La página Astro `/cdm-tv/` usa el menú y layout comunes, los tokens azul/oro y Montserrat. No se ha encontrado un manual en `manuales/`; los tokens existentes citan la paleta del manual. No se añaden dependencias ni almacenamiento. Todo queda local.

## Configuración y prueba local

El canal del club es `UCWH7Lmp-0n6Wjk3Ffl0cM_A`. En `.dev.vars` configura `YOUTUBE_CHANNEL_ID` (ID canónico `UC` y 22 caracteres, obtenido del canal) y `YOUTUBE_API_KEY` (YouTube Data API v3 habilitada). La clave solo la lee el Worker; nunca uses una variable `PUBLIC_` para ella. Usa el ID aunque tengas una URL `/channel/UC…`; las URL con handle no se resuelven automáticamente.

## Producción

`wrangler.jsonc` conserva el canal, el vídeo destacado y la detección de emisiones para que no se pierdan en futuros despliegues. `YOUTUBE_API_KEY` se guarda como secreto del Worker `cd-menciana-cms`; `.dev.vars` solo se usa en local y no se publica. Configura el secreto con `wrangler secret put YOUTUBE_API_KEY --config wrangler.jsonc` y despliega con `npm run deploy:worker`.

Cloudflare Access debe mantener una excepción pública exacta para `/api/cdm-tv`, sin abrir las rutas administrativas. La web de GitHub Pages ya se compila con `PUBLIC_CMS_API_URL=https://cms.cdmenciana.es`. Tras publicar, comprueba que `https://cms.cdmenciana.es/api/cdm-tv` devuelve JSON con `status: "ready"`, sin pedir inicio de sesión, y permite el origen `https://cdmenciana.es`.

Para la integración completa, ejecuta `npm run build:worker` y después `node node_modules/wrangler/bin/wrangler.js dev --config wrangler.jsonc --port 8788` en una terminal. En otra, ejecuta en PowerShell:

```powershell
$env:PUBLIC_CMS_API_URL='http://127.0.0.1:8788'
node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1
```

Configura `PUBLIC_WEB_ORIGIN=http://127.0.0.1:4321` en `.dev.vars` para CORS y visita `http://127.0.0.1:4321/cdm-tv/`. Sin `PUBLIC_CMS_API_URL`, `npm run dev` permite revisar el estado vacío sin backend. Un endpoint inaccesible muestra error y botón de reintento. No hacen falta migraciones para CDM TV.

`YOUTUBE_FEATURED_VIDEO_ID` admite un ID de 11 caracteres. Sin clave, permite abrir un vídeo configurado, sin inventar fecha ni etiquetarlo como directo. Con API, se comprueba que el vídeo público pertenece al canal. La prioridad es directo confirmado, próxima emisión por fecha, ID preferido y vídeo reciente.

## Actualización y límites

El endpoint público `/api/cdm-tv` reutiliza el Worker y CORS existentes. `channels.list` obtiene la lista de subidas (caché 24 horas), `playlistItems.list` sus 12 entradas recientes (5 minutos) y `videos.list` los metadatos/estado/reproducción (5 minutos). No hay scraping, OAuth, base de datos nueva ni clave en la respuesta. Caché negativa de errores: 60 segundos. Las consultas tienen timeout de 8 segundos; el navegador, 15 segundos.

La lista de subidas no garantiza descubrir directos activos o programados. `YOUTUBE_LIVE_DISCOVERY=1` activa dos consultas oficiales `search.list`, para `live` y `upcoming`, con caché de una hora y hasta 10 resultados de cada tipo. Se comprueba el estado con `videos.list`; una emisión finalizada requiere `actualEndTime`. Puede haber retrasos del índice de YouTube, vídeos omitidos o cancelados y hasta una hora de demora en descubrir una emisión nueva. Los estados de IDs ya encontrados se renuevan a los 5 minutos. Si falla una búsqueda, se conservan las subidas y se indica que la detección está incompleta. Las retransmisiones finalizadas se obtienen de los vídeos consultados; no es un archivo completo del canal.

Cloudflare Cache API es local al centro de datos, puede desalojar entradas y no garantiza límites globales ni deduplicación de solicitudes simultáneas. En desarrollo la persistencia depende del runtime. Dos búsquedas cada hora supondrían 48 llamadas diarias por centro de datos con tráfico continuo, antes de desalojos o fallos. Consulta la cuota efectiva del proyecto en Google Cloud antes de activar detección; viene desactivada para no gastar búsquedas sin necesidad. Para tráfico distribuido que requiera una cuota global garantizada habría que centralizar la sincronización, fuera de esta integración mínima. Nunca se promete detección instantánea. Sin búsqueda, el ID destacado permite incluir una emisión que no esté en las subidas.

El navegador consulta al entrar o al reintentar. En el inicio, vuelve a consultar cada minuto mientras la página está visible y al regresar a ella, para mostrar u ocultar el aviso de directo sin recargar. Un fallo general no muestra una falsa etiqueta de emisión. Los estados confirmados pueden quedar desfasados durante el intervalo de caché.

El destacado aparece una sola vez. Los demás vídeos y retransmisiones finalizadas comparten una biblioteca con filtros Todos, Vídeos y Retransmisiones. Las emisiones activas o próximas restantes aparecen antes de la biblioteca únicamente cuando existen; no se presentan columnas vacías ni un segundo archivo de vídeos repetidos. El enlace al canal se concentra junto al destacado.

## Reproducción

La marca CDM TV del menú (escritorio y móvil) muestra un marco rojo y `LIVE` solo cuando el endpoint confirma al menos un vídeo con estado `live`. En el inicio, aparece además una franja debajo de la cabecera, con el título de la emisión y el enlace «Ver en directo» a CDM TV. El enlace admite teclado, tiene foco visible y un área táctil de al menos 48 píxeles. El título se anuncia con `aria-live="polite"` sin mover el foco. Ante un error o sin emisión activa se oculta el aviso. El menú comparte la solicitud con CDM TV; conserva los intervalos de caché indicados arriba. Para revisar el diseño sin una emisión real, Astro en desarrollo admite `/?preview-cdm-live=1`. Este modo simula el indicador del menú y el aviso del inicio, identifica la emisión como una vista previa local y está desactivado en compilaciones de producción.

Miniaturas 16:9 con dimensiones reservadas y carga diferida (salvo destacado). Un único `dialog` nativo gestiona teclado, Escape, foco atrapado y devolución al botón de apertura. Solo después de aceptar la conexión para ese vídeo se inserta un iframe oficial `youtube-nocookie.com`, sin autoplay. El cierre destruye el iframe. No existe un gestor de consentimiento externo previo en la web; esta autorización no se almacena. Las miniaturas se sirven desde `i.ytimg.com`, conexión externa que ocurre al presentar vídeos. Si se necesita bloquear también esas imágenes, debe integrarse con una futura política global de contenido externo.

Los vídeos que la API marque como no incrustables tienen acceso a YouTube. También se ofrece siempre ese enlace: restricciones regionales, edad, eliminación o cambios posteriores pueden impedir reproducción pese a `embeddable`. No hay animaciones propias; se mantiene la regla global de movimiento reducido.

## Fuentes oficiales

- [Subidas frente a búsqueda y filtros de emisiones](https://developers.google.com/youtube/v3/docs/search/list)
- [Metadatos de vídeos](https://developers.google.com/youtube/v3/docs/videos/list)
- [Lista de subidas del canal](https://developers.google.com/youtube/v3/docs/channels/list)
- [Caché de Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/cache/)

Validación: `npm test`, `npm run build`, `npm run build:worker`. La reproducción real y la detección del canal requieren proporcionar canal/clave y emisiones reales; los casos de integración se pueden comprobar con respuestas de prueba sin publicar contenido ficticio.

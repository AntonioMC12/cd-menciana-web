# CD Menciana — web oficial

Sitio público y panel editorial del Club Deportivo Menciana Apaga y Vámonos F.S. La web Astro se publica como sitio estático en GitHub Pages. Cloudflare Worker aloja el panel y la API; D1 guarda publicaciones y R2 las fotografías. El diseño se basa en el *Manual de Marca 2026–27* facilitado por el club.

## Desarrollo

```sh
npm install
npm run db:local
npm run dev
npm run dev:worker
npm run check
npm test
npm run build
npm run build:worker
node scripts/local-smoke.mjs
```

Ejecuta `dev` y `dev:worker` en terminales distintas. Antes de abrir el panel local, copia `.dev.vars.example` a `.dev.vars` y configura `PUBLIC_CMS_API_URL=http://127.0.0.1:8787` para Astro. La guía de configuración, seguridad, despliegue y copias de seguridad está en [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md). `.dev.vars` y los secretos no se versionan.

## Publicación

La acción de GitHub Pages publica la web pública desde `main` en `https://cdmenciana.es/` y la conecta con `https://cms.cdmenciana.es`. Publicar o retirar noticias y galerías solicita automáticamente una reconstrucción cuando el Worker tiene el secreto `GITHUB_DEPLOY_TOKEN` configurado; ver [configuración](docs/CLOUDFLARE.md#actualización-automática-desde-el-panel). También reconstruye la web cada seis horas como respaldo; GitHub Actions puede retrasar las ejecuciones programadas. El Worker se despliega por separado con `npm run deploy:worker` después de preparar D1, R2, Access y secretos. Las PR solo ejecutan comprobaciones.

## Contenido

Edita `src/data/site.ts`. Los tipos están en `src/data/types.ts`:

- `teams`: nombre, categoría, temporada y descripción.
- `players`: plantilla y ruta de fotografía; dorsal y posición se añaden cuando estén confirmados.
- `matches`: partidos, fecha ISO con zona horaria cuando se conoce la hora, sede y marcador. Los del primer equipo proceden de `src/data/first-team.ts`.
- Las noticias reales y los álbumes se gestionan en `/admin/` y se almacenan en D1.
- `sponsors`: entidad, logotipo, tipo (`sponsor` o `institutional`), nivel de colaboración y URL opcional. Los patrocinadores principales, los demás patrocinadores y las entidades públicas se muestran por separado.

Usa `status: 'confirmed'` (o `publication: 'confirmed'` en partidos) solo con datos verificados. Los nombres o apodos de la plantilla proceden de los archivos facilitados por el club. Los dorsales y la posición de los porteros se actualizaron con la lista del club; Tamajón se incorporó con el dorsal 9 y Adri Luna sigue sin dorsal. Capricho Andaluz y RAVI son los patrocinadores principales; los demás y las entidades públicas se muestran por separado.

### Calendario y clasificación de los equipos

El Worker consulta cada hora el [visor oficial RFAF](https://stars.rfaf.es/) para el grupo 17 de 3.ª División F.S. de la temporada 2026/27 (delegación `9`, competición `48466108`, grupo `48466109`). Guarda calendario, resultados y clasificación en D1; la web los obtiene de `GET /api/sports` sin reconstruir GitHub Pages. Si el visor falla o cambia de formato, conserva la última copia válida. `src/data/first-team.ts` es la instantánea inicial que se muestra mientras carga la API o si no está disponible. La página de calendario muestra cuándo se sincronizó y enlaza a la RFAF. Para cambiar de temporada hay que actualizar los identificadores, el límite de jornadas, la clave de la instantánea y los datos iniciales.

La página **Equipos** permite elegir entre los siete equipos. El primer equipo, filial, cadete e infantil muestran próximos partidos, resultados y clasificación. Las tres escuelas muestran solo su nombre. El calendario permite filtrar esas cuatro categorías o verlas juntas, cambiar de mes y consultar cada partido; conserva categoría, mes y vista en la URL. El Worker guarda una instantánea por equipo y expone `GET /api/sports?team=filial`, `?team=cadete` y `?team=infantil`, además de la ruta sin parámetro del primer equipo. Los grupos y enlaces oficiales se definen en `src/data/team-competitions.ts`. Al comenzar una temporada nueva hay que verificar allí los identificadores de competición y grupo de cada equipo.

Los escudos de los rivales del filial, cadete e infantil se guardan en `public/images/equipos/` y se relacionan con sus nombres en `src/data/team-crests.ts`. Proceden de las páginas oficiales de la RFAF consultadas el 4 de octubre de 2026. El Worker añade estas rutas incluso a las instantáneas deportivas que ya estaban guardadas en D1. Si aparece un equipo nuevo sin escudo local, usa temporalmente la imagen publicada por la RFAF para ese partido.

Los escudos de los rivales publicados hasta la jornada 7 están en `public/images/equipos/` y proceden de las fichas de partido de la RFAF consultadas el 4 de octubre de 2026. Las jornadas nuevas se muestran automáticamente; sus escudos requieren guardar el archivo en esa carpeta y añadir la ruta en `src/data/first-team.ts`.

El escudo vectorizado está en `public/images/escudo-oficial.svg`. `Crest.astro` lo usa en la cabecera, el pie, la portada, la página del club, las tarjetas y los elementos decorativos; el favicon apunta al mismo archivo. La portada usa la foto de la plantilla a la derecha, como en la maqueta del manual de marca, con versiones WebP para móvil y escritorio y un JPEG de respaldo. Coloca otras fotografías y logotipos autorizados en `public/images/equipo/`, `public/images/jugadores/` y `public/images/patrocinadores/`.

## Estructura

`src/pages/` contiene la web pública. `worker/` contiene el panel y las rutas API. `src/lib/cms.ts` centraliza acceso a D1/R2, validación y autorización. `migrations/` define el esquema. `@astrojs/sitemap` genera el mapa de páginas estáticas. `scripts/generate-og.py` genera las imágenes sociales SVG y PNG con el escudo actual y Montserrat convertida a trazados; requiere Pillow, FontTools y Sharp (incluido con Astro). Las publicaciones reales se obtienen del CMS durante la compilación y generan HTML en `/noticias/[slug]/` y `/galerias/[slug]/`, con metadatos y datos estructurados propios. El título, resumen y portada de la publicación alimentan los metadatos; el texto alternativo de las fotos se muestra en las galerías. Si el CMS configurado falla durante el build, la compilación falla para evitar publicar una web vacía. Las rutas antiguas `detalle/?slug=` redirigen en el navegador y están excluidas del sitemap.

## Decisiones del manual

| Página | Referencia aplicada |
| --- | --- |
| Portada | Mensaje “Más que fútbol sala”, gran jerarquía, azul y dorado, orgullo local. |
| Identidad visual | Paleta general: azul `#0E62C8`, marino `#0B2F6B`, claro `#9FD6F3`, blanco `#F8FBFF`, oro `#D6A84B`, gris `#1F2A3A`. Escudo vectorizado a partir de las imágenes facilitadas por el club. |
| Sistema gráfico | Patrón geométrico, marca circular, composición azul, fotografía de alto contraste con fondo limpio. Por falta de fotos autorizadas se usan composiciones CSS y espacios reservados. |
| Publicaciones | Bloques claros para próximo partido, resultado y noticia; titulares destacados y lectura móvil. Los marcadores/nombres mostrados en las maquetas son ejemplos, no datos deportivos. |
| Diseño web | Navegación, tarjetas, prioridad del próximo partido, resultados y noticias, botones primarios y dorados, diseño adaptable. La página propone marino `#0D2E5B`, azul `#2F7AC6`, claro `#CFE7F8`, oro `#C9A961`, fondo `#F4F7FB` y Montserrat. |

La paleta web difiere ligeramente de la paleta general. Las variables `--ui-*` siguen la propuesta web para superficies y controles; `--brand-*` conservan los valores generales del manual. La tipografía de titulares de la página 2 no especifica una familia concreta; se usa Montserrat ExtraBold, indicado explícitamente en la página web del manual, con mayúsculas y espaciado ajustado. El manual usa nombres de patrocinadores y resultados en ejemplos de diseño; no se trasladan como hechos.

## Pendiente antes del lanzamiento

- Confirmación del dorsal de Adri Luna y de las posiciones de los jugadores de campo.
- Plantilla confirmada y noticias reales; actualización periódica de calendario, sedes, resultados y clasificación.
- Dominio personalizado, si el club decide usar uno.

La página de contacto muestra el correo facilitado por el club, el Pabellón de Deportes Alcalde Julio Priego y los perfiles sociales como vías para enviar mensajes.

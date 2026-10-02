# CD Menciana — web oficial

Sitio público y panel editorial del Club Deportivo Menciana Apaga y Vámonos F.S., construido con Astro 7, Cloudflare Workers, D1 y R2. El diseño se basa en el *Manual de Marca 2026–27* facilitado por el club. Las páginas institucionales se generan como HTML estático; portada, noticias, galerías y administración se renderizan en el Worker.

## Desarrollo

```sh
npm install
npm run db:local
npm run dev
npm run check
npm test
npm run build
node scripts/local-smoke.mjs
```

Antes de abrir `/admin/` en local, copia `.dev.vars.example` a `.dev.vars`. La guía completa de configuración, seguridad, despliegue y copias de seguridad está en [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md). `.dev.vars` y los secretos no se versionan.

## Publicación

La acción de GitHub Pages se ha retirado. La acción actual solo comprueba tipos, pruebas y compilación en las PR. No hay publicación automática. El comando `npm run deploy` queda para ejecutarlo manualmente después de preparar D1, R2, Access, secretos y dominio conforme a [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md).

## Contenido

Edita `src/data/site.ts`. Los tipos están en `src/data/types.ts`:

- `teams`: nombre, categoría, temporada y descripción.
- `players`: plantilla, dorsal, posición y ruta de fotografía.
- `matches`: partidos, fecha ISO con zona horaria, sede y marcador.
- `articles`: tres ejemplos editoriales etiquetados como muestras. Las noticias reales y los álbumes se gestionan en `/admin/` y se almacenan en D1.
- `sponsors`: entidad, logotipo, tipo (`sponsor` o `institutional`), nivel de colaboración y URL opcional. Los patrocinadores principales, los demás patrocinadores y las entidades públicas se muestran por separado.

Usa `status: 'confirmed'` (o `publication: 'confirmed'` en partidos) solo con datos verificados. Los artículos iniciales tienen estado `provisional`, se etiquetan como muestras y se excluyen de indexación; no se importan a D1 ni se convierten en noticias reales. Las listas de jugadores y partidos permanecen vacías hasta recibir datos confirmados. Capricho Andaluz y RAVI son los patrocinadores principales; los demás y las entidades públicas se muestran por separado.

El escudo vectorizado está en `public/images/escudo-oficial.svg`. `Crest.astro` lo usa en la cabecera, el pie, la portada, la página del club, las tarjetas y los elementos decorativos; el favicon apunta al mismo archivo. La portada usa la foto de la plantilla a la derecha, como en la maqueta del manual de marca, con versiones WebP para móvil y escritorio y un JPEG de respaldo. Coloca otras fotografías y logotipos autorizados en `public/images/equipo/`, `public/images/jugadores/` y `public/images/patrocinadores/`.

## Estructura

`src/pages/` contiene inicio, páginas institucionales, noticias, galerías, panel, rutas privadas y error 404. `src/lib/cms.ts` centraliza acceso a D1/R2, validación y autorización. `migrations/` define el esquema. `@astrojs/sitemap` genera el mapa de páginas estáticas y `/sitemap-content.xml` añade las publicaciones visibles. `scripts/generate-og.py` permite regenerar la imagen social PNG con Pillow.

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

- Fotografías individuales de jugadores y material adicional, con autorización de uso.
- Equipos y plantilla confirmados; calendario, sedes, resultados y noticias reales.
- Correo, dirección y redes sociales institucionales verificadas.
- Dominio personalizado, si el club decide usar uno.

El contacto no muestra un formulario inerte ni inventa una dirección de correo. Al facilitar una dirección verificada, se puede activar el enlace `mailto:` ya previsto en la página.

# CD Menciana — web oficial

Sitio público del Club Deportivo Menciana Apaga y Vámonos F.S., construido con Astro y TypeScript. El diseño se basa en el *Manual de Marca 2026–27* facilitado por el club. El proyecto se genera como HTML estático; la navegación y el contenido principal no dependen de JavaScript del cliente.

## Desarrollo

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

El proyecto está configurado para `https://antoniomc12.github.io/cd-menciana-web/`. La URL canónica, las imágenes sociales, el sitemap y los enlaces internos incluyen la ruta del repositorio. `.env.example` muestra las variables que puedes usar si cambias de dominio o de ruta en el futuro.

## Publicar en GitHub Pages

1. En [Settings → Pages](https://github.com/AntonioMC12/cd-menciana-web/settings/pages), selecciona **GitHub Actions** en **Build and deployment → Source**.
2. Sube el proyecto a la rama `main`, incluido `package-lock.json` y `.github/workflows/deploy.yml`:

   ```sh
   git add .
   git commit -m "Preparar web para GitHub Pages"
   git push origin main
   ```

3. Comprueba que la ejecución **Deploy to GitHub Pages** termina correctamente en la pestaña **Actions**. La web quedará en [antoniomc12.github.io/cd-menciana-web](https://antoniomc12.github.io/cd-menciana-web/). Cada nuevo push a `main` volverá a publicarla.

El archivo `.env` permanece fuera de Git. Para un dominio personalizado, configura también ese dominio en Pages y elimina el prefijo `/cd-menciana-web` estableciendo `PUBLIC_SITE_BASE=/` en el entorno de compilación.

## Contenido

Edita `src/data/site.ts`. Los tipos están en `src/data/types.ts`:

- `teams`: nombre, categoría, temporada y descripción.
- `players`: plantilla, dorsal, posición y ruta de fotografía.
- `matches`: partidos, fecha ISO con zona horaria, sede y marcador.
- `articles`: noticias; cada `slug` genera una página automáticamente.
- `sponsors`: entidad, logotipo, URL y nivel de colaboración.

Usa `status: 'confirmed'` (o `publication: 'confirmed'` en partidos) solo con datos verificados. Los artículos iniciales tienen estado `provisional` y se etiquetan como muestras; las páginas de detalle están excluidas de indexación. Las listas de jugadores y partidos permanecen vacías hasta recibir datos confirmados. La lista de colaboradores incluye los cuatro logos institucionales facilitados por el club.

El escudo vectorizado está en `public/images/escudo-oficial.svg`. `Crest.astro` lo usa en la cabecera, el pie, la portada, la página del club, las tarjetas y los elementos decorativos; el favicon apunta al mismo archivo. La portada usa la foto de la plantilla a la derecha, como en la maqueta del manual de marca, con versiones WebP para móvil y escritorio y un JPEG de respaldo. Coloca otras fotografías y logotipos autorizados en `public/images/equipo/`, `public/images/jugadores/` y `public/images/patrocinadores/`.

## Estructura

`src/pages/` contiene inicio, club, equipos, calendario, noticias, patrocinadores, contacto y error 404. `src/components/` contiene cabecera, pie, tarjetas, marcador y tarjetas de jugadores/patrocinadores. `src/layouts/BaseLayout.astro` centraliza metadatos y etiquetas Open Graph. `src/styles/global.css` contiene variables de diseño y estilos adaptables. `@astrojs/sitemap` genera el sitemap durante la compilación. `scripts/generate-og.py` permite regenerar la imagen social PNG con Pillow.

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
- Otros patrocinadores y logotipos autorizados, si los hubiera.
- Correo, dirección y redes sociales institucionales verificadas.
- Dominio personalizado, si el club decide usar uno.

El contacto no muestra un formulario inerte ni inventa una dirección de correo. Al facilitar una dirección verificada, se puede activar el enlace `mailto:` ya previsto en la página.

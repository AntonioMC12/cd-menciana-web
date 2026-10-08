# Sitemap público

`/sitemap-index.xml` es el índice XML que se envía a Search Console. Astro lo reconstruye al publicar la web e incluye mapas separados para páginas, noticias y galerías. Las noticias y álbumes publicados se incorporan desde las rutas generadas por el CMS. `robots.txt` y la cabecera HTML siguen anunciando la misma dirección del índice.

La política de `scripts/sitemap-options.mjs` admite las secciones públicas, los detalles de publicaciones y la paginación de noticias. Excluye rutas internas, stock, material de campaña, detalles antiguos, parámetros, fragmentos y dominios ajenos. Cuando se añade una nueva sección pública, debe incorporarse a la lista `sections`.

Después de generar los mapas, la compilación comprueba que cada URL tiene un HTML generado, coincide con su canonical, permite indexación y aparece una sola vez. También exige que el índice incluya la portada. Una discrepancia detiene la publicación.

No se añaden fechas `lastmod` sin una fuente fiable de modificación del contenido publicado. Tampoco se añaden `priority` ni `changefreq`: Google ignora ambos campos. Los mapas no incluyen espacios de nombres de imágenes, vídeos o Google News si no utilizan esas extensiones.

Verificación: `npm exec vitest run tests/sitemap.test.ts` y `npm run build` con `PUBLIC_CMS_API_URL=https://cms.cdmenciana.es`, `PUBLIC_SITE_URL=https://cdmenciana.es` y `PUBLIC_SITE_BASE=/`.

El sitemap facilita el descubrimiento y el diagnóstico de las URLs; no garantiza su indexación ni una posición. Referencia: [documentación de sitemaps de Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

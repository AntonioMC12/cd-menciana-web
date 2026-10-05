# Rediseño de noticias

## Sistema editorial conservado

Astro genera el HTML público durante la compilación desde `PUBLIC_CMS_API_URL`. El Worker ofrece el panel y la API; D1 conserva `draft_json` y `published_json`, versiones, slug publicado y fecha de publicación. Guardar cambios no sustituye la versión pública hasta pulsar Publicar. No existe programación ni un campo de destacado.

Los campos de noticia son título, extracto, categoría, cuerpo y portada opcional. El formulario actual exige título, extracto, categoría y cuerpo; la presentación pública también tolera extractos o categorías vacíos en datos antiguos. El cuerpo es texto plano dividido por líneas en blanco, no HTML ni Markdown. Se conserva el escapado de Astro y se respetan saltos de línea dentro de los párrafos. Encabezados, tablas y contenido enriquecido no son formatos del editor actual.

El panel transforma las fotos en WebP: imagen de hasta 2000 px y miniatura de hasta 480 px, almacenadas en R2. Se conservan `/media/{id}/web` y `/media/{id}/thumb`. La portada y el detalle usan la versión grande con prioridad alta; las tarjetas usan miniaturas con carga diferida. Las cajas tienen proporción reservada y `object-fit: contain` para mostrar la imagen completa. No se inventan descripciones de fotos, autores, temporadas de las noticias ni pies de foto.

## Diseño

Cabecera editorial azul marino, Montserrat y acentos dorados del manual de marca. La publicación más reciente ocupa una composición principal con fotografía y titular. El archivo muestra ocho tarjetas adicionales en la primera página y nueve en las posteriores. La principal no se repite. Las páginas `/noticias/pagina/2/`, etc. son HTML estático con canonical propio, sitemap y enlaces anterior/siguiente. Se conservan los slugs individuales y el acceso antiguo `detalle/?slug=`.

En tablet la principal pasa a una columna; el archivo conserva dos columnas. En móvil todas las tarjetas pasan a una columna. Los títulos y extractos pueden crecer sin recortes. Sin imagen se muestra una composición con el escudo real del club; sin extracto se omite su bloque; el listado vacío tiene un estado específico.

El detalle usa título sin mayúsculas forzadas, entradilla opcional, fecha y categoría reales, fotografía completa y cuerpo de hasta 720 px. Se conserva NewsArticle, las migas de pan, canonical y metadatos sociales. Compartir ofrece WhatsApp, correo y copia del enlace canonical cuando el navegador dispone de portapapeles seguro. Los enlaces siguen funcionando sin JavaScript. Las tres recomendaciones priorizan categoría y se completan con noticias recientes, excluyendo la abierta.

No se incorporan campos obligatorios, dependencias, migraciones ni búsquedas innecesarias. El panel añade ayuda sobre la portada opcional y el formato horizontal.

## Corrección del archivo del CMS

La API pedía diez filas para detectar si había otra página, mostraba nueve y avanzaba diez. Esto omitía una publicación por página. `publishedList` permite ahora separar el tamaño de página del número de filas consultadas. Noticias y galerías avanzan nueve posiciones al consultar diez. Se mantiene la forma de la respuesta API y se añade una prueba de regresión que comprueba continuidad y ausencia de duplicados.

## Verificación local

- `npm run build`: comprobación Astro y generación estática sin errores, advertencias ni sugerencias; también con doce noticias de prueba, detalle y dos páginas de archivo.
- `npm run build:worker`: generación del cliente editorial correcta.
- `npm test`: 15 pruebas aprobadas, incluidas continuidad del archivo, selección de recomendaciones y fechas antiguas.
- `scripts/local-smoke.mjs` contra el Worker local: crear, editar, publicar, retirar y eliminar; fotos privadas y públicas; versiones y cambios sin publicar; slugs; CSRF y CORS.
- Formulario local: crear y editar un borrador, comprobar la ayuda de portada y abrir su previsualización, sin publicarlo.
- Navegador: listado y detalle a 375, 768, 1024 y 1440 px. Anchos de lectura de 328, 704,8 y hasta 720 px. Sin desbordamiento horizontal.
- Archivo: nueve publicaciones en la primera página (principal más ocho tarjetas) y tres en la segunda; doce URLs distintas, sin saltos ni duplicados.
- Datos locales de prueba: fechas antiguas y actuales, noticia sin foto ni extracto ni categoría, título largo, cuerpo extenso, párrafos y saltos de línea. Texto con `<script>` y sintaxis Markdown se muestra literalmente; no hay scripts insertados en el cuerpo.
- Portada con una sola publicación: sin tarjetas adicionales ni paginación; escudo cuando falta la fotografía y sin bloque de extracto vacío.
- Copiar enlace muestra confirmación de éxito. WhatsApp y correo tienen enlaces con título y canonical correctamente codificados; no se enviaron mensajes.
- Inspección visual: ajuste de composición en tablet y corrección del contraste de la entradilla heredado del estilo anterior.

Todas las escrituras y publicaciones de prueba se realizaron en D1/R2 locales. No se ha desplegado la web ni el Worker, ni se ha publicado contenido en producción. La revisión de noticias reales de producción, el inicio de sesión de Cloudflare Access en producción y el envío efectivo por WhatsApp/correo quedan fuera de la verificación local.

Al desplegar, actualizar también el Worker para que el archivo completo se genere con la paginación corregida. La incorporación de noticias sigue dependiendo de la reconstrucción del sitio, como antes del rediseño.

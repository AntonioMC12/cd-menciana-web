# Tienda del CD Menciana

Vista previa: `/tienda/`. La página no figura en los menús, queda fuera del sitemap y declara `noindex`. Quien conozca la dirección puede abrirla; no requiere contraseña.

## Editar el catálogo

Los datos están en `src/data/shop.ts`. Cada producto admite nombre, descripción, categoría, imágenes con texto alternativo y dimensiones, precio opcional, tallas, variantes e información de disponibilidad. Las imágenes optimizadas se guardan en `public/images/tienda/`.

El CMS actual gestiona noticias y galerías. El catálogo permanece en este archivo de datos, sin ampliar el panel ni introducir servicios externos.

El precio ausente se muestra como «Precio a consultar». Las tallas y variantes solo se muestran si se rellenan; no se presuponen existencias. Un catálogo vacío conserva el bloque de contacto y muestra «Estamos preparando el catálogo». Si falta una imagen, la tarjeta muestra «Imagen pendiente».

El catálogo contiene 21 artículos: el carnet de socio de la temporada 26/27, la bufanda y 19 prendas independientes. En las prendas, las partes superiores y los pantalones de las 11 imágenes originales se presentan por separado, conservando las vistas delantera y trasera. Cada prenda tiene su propio precio de prueba y consulta de WhatsApp.

## Contacto y precios de prueba

`shop.contact` define el correo y el teléfono en un único lugar. El contacto facilitado es `+34 628 112 604`, con `phoneIsExample: false` y `whatsappConfirmed: true`. El número visible permite llamar mediante `tel:`.

El carnet de socio y la bufanda tienen precios provisionales de 30 € y 12 €, respectivamente. Sus mensajes de consulta no solicitan talla; el carnet pregunta por las condiciones de socio, sin presuponer beneficios.

Los botones de consulta, tanto en las tarjetas como en el visor, abren `https://wa.me/34628112604` con el producto indicado y espacio para especificar talla. El usuario revisa el texto y pulsa Enviar en WhatsApp; la web no envía mensajes automáticamente. El club confirma disponibilidad, precio final, pago y entrega. Si se desactiva `whatsappConfirmed`, los botones vuelven a usar el correo del club.

`shop.preview: true` identifica los precios como pruebas. Antes de desactivar el aviso, completar los precios reales y confirmar tallas, variantes y disponibilidad. La imagen aportada para la primera equipación de portero ya contiene recortes en sus bordes; los recortes por prenda conservan esa limitación del original.

## Archivos

- `src/pages/tienda.astro`: estructura de la página y datos del visor.
- `src/components/ShopProductCard.astro`: tarjetas de producto.
- `src/styles/shop.css`: diseño responsive.
- `src/scripts/shop.ts`: filtros y visor de imágenes, con cierre por Escape y retorno de foco.
- `astro.config.mjs`: exclusión de la tienda del sitemap.

La navegación y los archivos de la campaña no se modifican. El catálogo funciona sin JavaScript: todos los productos se muestran, las imágenes enlazan al archivo y las consultas siguen abriendo WhatsApp.

Precios confirmados: camiseta de juego (incluidos porteros) 25 €, pantalón de juego 20 €, sudadera/chaqueta de chándal 25 €, pantalón de chándal 20 €, polo 20 € y bermuda de paseo 15 €. Estos artículos tienen `priceConfirmed: true` y no llevan el aviso de precio de prueba. Entrenamiento, bufanda y carnet de socio conservan sus precios provisionales.

El pantalón corto de entrenamiento es un único artículo común a todas las categorías, con la imagen `pantalon-entrenamiento.webp` facilitada por el club. Sustituye a los cuatro pantalones anteriores por equipo y conserva el precio provisional de 10 €.

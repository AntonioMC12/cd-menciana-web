# Galerías: arquitectura y validación

## Arquitectura conservada

Astro genera el índice y `/galerias/[slug]/` desde la API pública durante el build. El índice obtiene todas las páginas de álbumes (9 por página); el detalle entrega todos los metadatos del álbum. El panel limita las nuevas subidas a 20 fotos por álbum. No hay paginación de fotografías y el contador del diálogo coincide con el conjunto recibido, conservando `published_position`.

D1 mantiene álbumes, relación opcional con noticias, portada, textos alternativos, posiciones y versiones independientes de borrador/publicación. R2 guarda una miniatura WebP de hasta 480 px y una versión WebP de hasta 2000 px; el panel convierte las imágenes antes de subirlas y no conserva el original. La descarga entrega la versión `image_key`, la mejor disponible, sin modificar ni reconvertir sus bytes.

No se cambian campos, rutas existentes, identificadores, relaciones, ordenación, estados ni el panel. No se necesitan migraciones o nuevas subidas. Las fechas se presentan como fechas de publicación, no de celebración del evento. No se inventan pies ni descripciones; se reutiliza el texto alternativo publicado. La portada tiene un respaldo gráfico si falta o falla. Las fotos se muestran completas dentro de marcos de proporción fija, sin saltos durante la carga.

## Visualizador

Diálogo nativo con fondo oscuro, cierre, navegación sin vuelta automática, posición anunciada, zoom según resolución (hasta 4×), ajuste, rueda, arrastre, swipe, pinza y doble toque. Navegar restablece zoom y posición. Foco contenido con Tab/Shift+Tab, Escape y retorno a la miniatura; página bloqueada y posición restaurada. Controles de al menos 44 px, zonas seguras y diseño en vertical/horizontal. No se añaden dependencias al visualizador: diálogo nativo y Pointer Events cubren esta arquitectura sin incorporar un framework o librería.

La cuadrícula carga miniaturas diferidas. Al abrir se carga la versión grande y solo se precargan sus dos vecinas. Durante la carga permanece la foto anterior; un identificador de solicitud evita que una respuesta tardía sustituya la selección más reciente. Los errores permiten cerrar, navegar o reintentar al volver a la foto.

`GET /media/:id/download` reutiliza exactamente los permisos de medios públicos, incluidos los de portadas de noticias publicadas. No recibe URLs ni claves de R2 proporcionadas por el cliente. Devuelve un archivo adjunto con nombre seguro. El Worker permite CORS solo al origen público configurado; el cliente descarga mediante Blob con un nombre derivado del título y posición. Esto requiere publicar tanto el Worker como la web para funcionar en producción.

La vista previa del panel conserva su funcionamiento actual. Incorporar el mismo visualizador en esa vista, ordenar mediante arrastre o ampliar las ayudas de texto alternativo serían trabajos posteriores.

## Validación realizada

- `npm run build`: cero errores, avisos o hints; también compilado con álbumes públicos del CMS local de 0, 1 y 20 fotos.
- `npm test`: 19 pruebas correctas, incluidas descarga íntegra, cabeceras, fotos privadas/retiradas, portada pública, objeto ausente y variante inválida.
- `npm run build:worker`: correcto.
- `node scripts/local-smoke.mjs`: creación, subida, edición de borradores, publicación, conflicto de versiones, retirada, permisos y CORS. Comprueba igualdad byte a byte de la descarga con el archivo subido.
- Navegador: portadas, cuadrícula, álbum vacío, una foto con ambas flechas desactivadas, 20 fotos con extremo final desactivado, fotos horizontales/verticales/pequeñas, apertura, cierre, flechas de teclado, Escape, zoom, ajuste, arrastre y foco contenido/restaurado.
- Navegador a 375, 768, 1024 y 1440 px; comprobación adicional en horizontal a 812 × 375. Corregidos ajuste de fotos verticales y espacio de controles móviles tras inspección visual.
- Error de carga y descarga probado retirando álbumes solo en D1 local mientras su página seguía abierta; restaurados después.
- Proxy local retrasando una imagen 2,5 segundos: foto anterior conservada mientras carga y navegación posterior sin sobrescritura por la respuesta tardía.
- Descarga entre puertos: CORS y archivo adjunto comprobados en HTTP; navegador mostró «Descarga iniciada» y mantuvo abierto el diálogo. La herramienta de navegador no confirmó el evento de archivo guardado para el Blob.

## Límites de la validación

No se ha publicado ni alterado contenido de producción. La compatibilidad con contenido existente se basa en conservar el contrato actual y probar publicación/edición con el mismo panel y API local; no se han inspeccionado álbumes de producción. Los gestos de pinza, swipe y doble toque requieren validación en un dispositivo táctil real, en particular Safari/iOS. No hay archivos originales en el sistema actual que se puedan recuperar para ofrecer una descarga de mayor calidad.

Las pruebas usan una copia aislada de D1/R2 en `.wrangler/gallery-qa`; los datos nunca se suben a Cloudflare. `scripts/gallery-fixtures.mjs` crea álbumes de prueba exclusivamente en `127.0.0.1:8787`, usando Sharp ya instalado con Astro para reproducir las versiones WebP. Usarlo con la configuración local aislada, nunca con un proxy a producción. El manifiesto se guarda en `.wrangler/gallery-fixtures.json`.

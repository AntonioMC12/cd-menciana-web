# Rediseño local de la portada

La home conserva Astro, los componentes compartidos, las rutas, los metadatos SEO y las fuentes de datos. No añade dependencias. La dirección visual sigue la paleta web del manual 2026/27 y Montserrat: fotografía del equipo, superposición azul marino, acentos dorados y secciones con más espacio.

## Archivos

- `src/pages/index.astro`: hero, competición, noticias, plantilla y categorías, historia, galerías publicadas, patrocinio y contacto.
- `src/styles/home.css`: estilos exclusivos de la home, incluidos ajustes del encabezado a 320 px. No modifica `global.css` ni los componentes compartidos.
- `src/scripts/home.ts`: apariciones opcionales al entrar en pantalla. El contenido sigue visible sin JavaScript y se respeta `prefers-reduced-motion`, también si cambia durante la sesión.

Las noticias admiten cero, una, dos o tres tarjetas. Sin noticias se muestra un mensaje y acceso a equipos. La galería se omite si no hay álbumes. Las imágenes y nombres proceden de los recursos existentes y del CMS. Las actualizaciones deportivas siguen usando los mismos atributos y el script existente; ante un fallo se conserva la copia publicada.

## Probar en PowerShell

Desde la raíz del proyecto:

```powershell
$env:PUBLIC_CMS_API_URL = 'https://cms.cdmenciana.es'
npm run dev
```

Abrir `http://localhost:4321/` (o la URL que imprima Astro). Para fijar la dirección usada en esta revisión:

```powershell
$env:PUBLIC_CMS_API_URL = 'https://cms.cdmenciana.es'
node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 4321
```

La variable se aplica únicamente a esa terminal. La API pública admite CORS desde el origen de producción: al consultar deportes desde localhost se conserva la copia inicial. Para trabajar con el CMS local, seguir `README.md` y usar `PUBLIC_CMS_API_URL=http://127.0.0.1:8787`, con el origen local adecuado en `PUBLIC_WEB_ORIGIN` del Worker. Esta tarea no cambia esa política.

Comprobaciones:

```powershell
npm test
npm run build
```

## Validación realizada

- Compilación con CMS sin configurar y con las noticias y galerías reales: cero errores y avisos.
- 26 tests existentes aprobados.
- Revisión visual en escritorio de 1440 px, tablet de 834 px y móviles de 390 y 320 px; verificación del ancho útil descontando la barra vertical de scroll.
- Menú móvil, enlace al bloque de competición y todos los enlaces internos de la home verificados; artículos y galerías reales responden con HTTP 200.
- Imágenes de portada, jugadores, galerías y patrocinadores revisadas en el navegador; recursos secundarios con carga diferida.
- Actualización deportiva real comprobada mediante una pasarela temporal local que solo admite GET hacia el CMS público. También verificada la conservación de la copia inicial cuando falla la conexión directa por CORS.
- Página del club revisada para comprobar el aislamiento de estilos; componentes y estilos compartidos sin cambios.

No se han creado ni editado publicaciones en el panel, ni enviado formularios. El panel de administración no se ha probado mediante operaciones de escritura. El usuario autoriza posteriormente publicar estos cambios en main. No se han creado PR ni ejecutado comandos de despliegue manual.

## Fotografías de acción y afición

Se incorporan tres originales facilitados en la carpeta `J2 - vs. C.D. Santaella 2010`, sin modificar los originales:

- `IMG_9489.jpg`: hero de acción con variantes WebP de escritorio y móvil. El encuadre móvil usa la fotografía vertical.
- `IMG_9335.jpg`: celebración en la sección de identidad, con el escudo separado en una zona de contraste.
- `IMG_9510.jpg`: nueva sección de afición con un enlace al calendario.

Las seis versiones están en `public/images/home/`, pesan aproximadamente 617 KB en total y cada recurso solicitado pesa entre 52 y 239 KB. Solo el hero tiene prioridad alta; el resto se carga de forma diferida. Las variantes son recortes y compresión de las fotos originales, sin imágenes generadas ni alteraciones del contenido.

Se añade entrada escalonada del texto principal y profundidad suave en las fotografías durante el desplazamiento. Este último efecto usa animaciones CSS vinculadas al scroll, solo en escritorio y navegadores compatibles. Sin soporte se conserva la composición estática. Ambos movimientos respetan la preferencia de movimiento reducido; no interceptan el scroll.

Los dos GIF originales no se copian a la web.

## Vídeos de Doña Mencía y el pabellón

Se integran los cuatro MOV facilitados (`donamencia1`, `donamencia2`, `donamencia3` y `pabellon`) en una secuencia de 13 segundos, con fundidos entre planos, sin sonido. Los originales permanecen intactos. Las versiones MP4 H.264 están en `public/videos/home/`: 1280 × 720 para escritorio (2,78 MB) y 854 × 480 para móvil (1,15 MB). La portada estática WebP ocupa 139 KB. No se añaden dependencias a la aplicación.

`src/scripts/home-film.ts` inicia la reproducción automática silenciada y en bucle, tanto en escritorio como en móvil. Se elimina el botón de pausa por petición del usuario y no se detiene al salir del hero. Si el navegador suspende la reproducción en segundo plano, se intenta reanudar al volver. La imagen estática permanece disponible si falla el archivo o se bloquea autoplay. Sin JavaScript se conserva el hero estático. Las animaciones de texto y scroll siguen respetando movimiento reducido.

Validación final: compilación con contenido público real, tests existentes y revisión de reproducción automática sin controles en escritorio y móvil. El navegador puede bloquear autoplay o suspender el vídeo según sus propias políticas. No se han medido Core Web Vitals en producción.
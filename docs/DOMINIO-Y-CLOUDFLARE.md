# Dominio propio y servicios Cloudflare: puesta en marcha

Esta guía parte de la arquitectura actual del proyecto: la web pública sigue en **GitHub Pages**, mientras que el panel, la API, la base de datos y las fotos se alojan en **Cloudflare**. Se ha comprado **`cdmenciana.es`** en DonDominio. En los ejemplos siguientes, `DOMINIO` significa `cdmenciana.es`.

| Dirección final | Servicio |
| --- | --- |
| `https://DOMINIO/` | Web pública en GitHub Pages; ya está elegido en «Custom domain» |
| `https://www.DOMINIO/` | Redirección al dominio raíz mediante GitHub Pages |
| `https://cms.DOMINIO/admin/` | Panel privado en Cloudflare Worker |
| `https://cms.DOMINIO/api/...` y `/media/...` | API y fotografías públicas del mismo Worker |

**Estado actual:** el dominio está comprado en DonDominio y existe una cuenta de Cloudflare. No se contrató Alojamiento Mini. Cloudflare tiene los cinco registros correctos, pero la zona aún está pendiente de activación pública. GitHub Pages ya tiene `cdmenciana.es` como dominio personalizado. La base D1 `cd-menciana` tiene las migraciones aplicadas y el bucket R2 `cd-menciana-photos` está creado. El Worker aún no está desplegado.

## 1. Elegir y comprar el dominio

1. En DonDominio, comprueba que `cdmenciana.es` figura como activo, que el titular es el club y que el correo del titular está verificado. Revisa la renovación automática.
2. Verifica el correo de la cuenta de Cloudflare y activa la autenticación de dos factores.
3. En **Cloudflare → Add a domain**, añade `cdmenciana.es` con el plan elegido. Cloudflare te asignará dos servidores DNS. **Todavía no los cambies en DonDominio:** prepara primero los registros de la sección siguiente.

## 2. Preparar GitHub Pages y el DNS público

Haz estos pasos después de tener el dominio activo:

1. En GitHub, el repositorio `AntonioMC12/cd-menciana-web` ya tiene `cdmenciana.es` en **Settings → Pages → Custom domain**. Déjalo así. La comprobación fallará hasta que el DNS esté listo.
2. En **Cloudflare → DNS → Records**, crea cuatro registros `A` con nombre `@` y valores `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`. Crea también un `CNAME` con nombre `www` y destino `antoniomc12.github.io` (sin `/cd-menciana-web`). Usa **DNS only** para estos cinco registros. Elimina los registros `A`, `AAAA` o `CNAME` de parking que entren en conflicto con `@` o `www`.
3. En **DonDominio → Mis dominios → cdmenciana.es → DNS → Editar servidores DNS → Servidores personalizados**, sustituye los servidores de DonDominio por los dos que Cloudflare asignó a esta zona. Guarda el cambio. Espera a que Cloudflare muestre la zona como **Active**; la propagación puede tardar varias horas.
4. Cuando el DNS responda, en la configuración de la cuenta `AntonioMC12` de GitHub entra en **Settings → Pages → Add a domain**, verifica `cdmenciana.es` con el registro TXT que indique GitHub y conserva ese TXT. Después pulsa **Check again** en la pantalla de Pages del repositorio.
5. El workflow `.github/workflows/deploy.yml` ya usa estos valores de compilación:

   | Variable | Valor |
   | --- | --- |
   | `PUBLIC_SITE_URL` | `https://DOMINIO` |
   | `PUBLIC_SITE_BASE` | `/` |
   | `PUBLIC_CMS_API_URL` | `https://cms.DOMINIO` |

6. En **Settings → Pages**, activa **Enforce HTTPS** cuando GitHub indique que el certificado está listo. GitHub Pages redirigirá `www.DOMINIO` a `DOMINIO` si ambos DNS están bien configurados.

## 3. Crear D1 y R2

La base D1 y el bucket R2 ya están creados. En PowerShell, dentro del repositorio, puedes comprobarlos con:

```powershell
npx wrangler login
npx wrangler d1 list
npx wrangler r2 bucket list
```

`wrangler login` abrirá el navegador para autorizar **la cuenta del club**. La base D1 ya está creada y configurada; conserva los bindings `DB` y `PHOTOS` y el nombre del bucket que ya figuran en el archivo.

Las migraciones ya están aplicadas a la base remota. Para aplicar futuras migraciones:

```powershell
npm run db:remote
```

Confirma en Cloudflare que aparecen la base `cd-menciana` y el bucket privado `cd-menciana-photos`. No publiques el bucket con `r2.dev` ni con un dominio público: el Worker controla el acceso a las fotos.

## 4. Preparar el Worker y el dominio `cms`

En `wrangler.jsonc`:

1. Confirma que `PUBLIC_WEB_ORIGIN` sea `https://DOMINIO` y `PUBLIC_WEB_BASE` sea `/`; ya están preparados en el repositorio.
2. Confirma que la ruta de dominio personalizado esté al nivel superior; también está preparada:

   ```jsonc
   "routes": [{ "pattern": "cms.DOMINIO", "custom_domain": true }],
   "workers_dev": false,
   ```

Cloudflare creará el DNS y el certificado de `cms.DOMINIO` al asociar el dominio personalizado al Worker. No crees un CNAME manual para `cms` que entre en conflicto con esa ruta.

## 5. Proteger el panel con Cloudflare Access

La API de noticias y las fotos deben ser públicas; **solo el panel y `/api/admin`** deben pedir identificación.

1. En Cloudflare, entra en **Zero Trust** y completa la configuración inicial del equipo. Apunta el **Team domain**, con formato `https://NOMBRE.cloudflareaccess.com`.
2. En **Zero Trust → Access controls → Applications**, crea una aplicación **Self-hosted and private** para el hostname `cms.DOMINIO`. Añade los caminos `/admin`, `/admin/*`, `/api/admin` y `/api/admin/*` como destinos protegidos. Comprueba en la interfaz que los cuatro están cubiertos.
3. Crea una política **Allow** limitada al correo concreto del administrador del club. Usa el inicio de sesión de Cloudflare restringido a miembros de la cuenta o un proveedor de identidad con MFA. Evita permitir un dominio de correo entero.
4. Copia el **Application AUD** de esa aplicación. El código del Worker valida la firma del token de Access, el Team domain, el AUD y el correo autorizado.
5. Crea los cuatro secretos del Worker, uno por comando. Wrangler solicitará cada valor sin guardarlo en Git:

   ```powershell
   npx wrangler secret put ACCESS_TEAM_DOMAIN --config wrangler.jsonc
   npx wrangler secret put ACCESS_AUD --config wrangler.jsonc
   npx wrangler secret put ADMIN_EMAIL --config wrangler.jsonc
   npx wrangler secret put CSRF_SECRET --config wrangler.jsonc
   ```

   Para `CSRF_SECRET`, genera una cadena aleatoria de al menos 32 caracteres. **Nunca** añadas `ENVIRONMENT=local` ni `LOCAL_ADMIN_BYPASS=1` como secretos o variables de producción. Esos valores solo pertenecen a `.dev.vars` en tu ordenador.

## 6. Desplegar y conectar los dos servicios

1. Ejecuta `npm run check`, `npm test` y `npm run build`.
2. Ejecuta `npm run deploy:worker`. Comprueba `https://cms.DOMINIO/api/posts`: debe responder sin pedir inicio de sesión. Comprueba `https://cms.DOMINIO/admin/`: debe pedir inicio de sesión y permitir solo el correo autorizado.
3. Publica el commit con los cambios de configuración y lanza **Actions → Deploy to GitHub Pages → Run workflow** en GitHub. La web debe abrir en `https://DOMINIO/`, sin la ruta antigua `/cd-menciana-web/`.
4. En el panel, crea una noticia y un álbum de prueba, asócialos, sube una foto y publícalos. Comprueba la portada, los enlaces y la galería desde el dominio público.
5. Comprueba la redirección `www.DOMINIO → DOMINIO`, el certificado HTTPS y que el panel no sea accesible sin autorización. Prueba también la web desde un móvil o una ventana privada.

## 7. Operación mínima

- Mantén el correo y la renovación del dominio bajo control del club. Guarda un segundo administrador de emergencia para Cloudflare y GitHub si existe una persona autorizada.
- Exporta D1 antes de cambios de esquema: `npx wrangler d1 export cd-menciana --remote --output=backup-cd-menciana.sql --config wrangler.jsonc`. Guarda esa copia y una copia cifrada de R2 fuera de Cloudflare.
- Revisa el consumo y las facturas de Cloudflare y el funcionamiento del formulario de acceso periódicamente.

Fuentes oficiales: [registrar un dominio](https://developers.cloudflare.com/registrar/get-started/register-domain/), [añadir DNS de un dominio comprado fuera](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [dominio personalizado en Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [D1 con Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/d1/), [R2 con Wrangler](https://developers.cloudflare.com/r2/reference/wrangler-commands/), [Access para Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [dominio en GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

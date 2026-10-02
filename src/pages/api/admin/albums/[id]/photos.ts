import type { APIRoute } from 'astro';
import { authorize, bindings, error, failure, json, readLimitedForm, webpDimensions } from '../../../../../lib/cms';
import { persistObjects } from '../../../../../lib/photo-storage';
export const prerender = false;
export const POST: APIRoute = async ({ request, params }) => {
  const deny = await authorize(request, true); if (deny) return deny;
  if (!params.id) return error('Álbum no válido.', 404);
  try {
    const album = await bindings().DB.prepare('SELECT id FROM albums WHERE id=?').bind(params.id).first();
    if (!album) return error('Álbum no encontrado.', 404);
    const form = await readLimitedForm(request, 4_000_000);
    const web = form.get('web'), thumb = form.get('thumb'), alt = form.get('alt');
    if (!(web instanceof File) || !(thumb instanceof File) || typeof alt !== 'string' || !alt.trim() || alt.length > 240) return error('Archivos o descripción no válidos.');
    if (web.size > 2_500_000 || thumb.size > 400_000 || web.size < 30 || thumb.size < 30) return error('Fotografía demasiado grande o vacía.', 413);
    const webBytes = new Uint8Array(await web.arrayBuffer()), thumbBytes = new Uint8Array(await thumb.arrayBuffer());
    const dims = webpDimensions(webBytes), small = webpDimensions(thumbBytes);
    if (!dims || !small || dims.width > 2000 || dims.height > 2000 || small.width > 480 || small.height > 480 || small.width > dims.width || small.height > dims.height || Math.abs(dims.width / dims.height - small.width / small.height) > .02) return error('Solo se aceptan imágenes WebP optimizadas de hasta 2000 px y miniaturas de 480 px con la misma proporción.');
    const count = await bindings().DB.prepare('SELECT COUNT(*) AS n FROM photos WHERE album_id=? AND draft_deleted=0').bind(params.id).first<{ n: number }>();
    if ((count?.n || 0) >= 20) return error('Máximo de 20 fotos por álbum.', 409);
    const id = crypto.randomUUID(), imageKey = `albums/${params.id}/${id}-web.webp`, thumbKey = `albums/${params.id}/${id}-thumb.webp`;
    await persistObjects(bindings().PHOTOS, imageKey, thumbKey, webBytes, thumbBytes, async () => {
      await bindings().DB.batch([
        bindings().DB.prepare('INSERT INTO photos(id,album_id,image_key,thumb_key,width,height,bytes,mime,draft_alt,draft_position) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, params.id, imageKey, thumbKey, dims.width, dims.height, web.size + thumb.size, 'image/webp', alt.trim(), count?.n || 0),
        bindings().DB.prepare('UPDATE albums SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(params.id),
      ]);
    });
    return json({ id, width: dims.width, height: dims.height }, 201);
  } catch (e) { return failure(e); }
};

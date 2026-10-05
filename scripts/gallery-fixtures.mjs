// Disposable local CMS fixtures. Never accepts a production origin.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:8787';
const page = await (await fetch(`${origin}/admin/`)).text();
const csrf = page.match(/data-csrf="([a-f0-9]+)"/)?.[1];
assert.ok(csrf, 'Start the isolated local Worker with local admin enabled.');
const headers = { origin, 'x-cdm-csrf': csrf };
async function call(path, method, body) {
  const response = await fetch(`${origin}${path}`, { method, headers: { ...headers, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  assert.ok(response.ok, await response.clone().text());
  return response.json();
}
const suffix = Date.now();
const albums = [];
for (const [label, count] of [['Vacío', 0], ['Una fotografía', 1], ['En la pista', 20]]) {
  const slug = `prueba-galeria-${count}-${suffix}`;
  const content = { slug, title: `Prueba local · ${label}`, description: 'Álbum de validación local del visualizador.', coverPhotoId: null };
  const album = await call('/api/admin/albums/', 'POST', content);
  let first;
  for (let i = 0; i < count; i++) {
    const portrait = i % 3 === 1;
    const input = portrait ? 'public/images/presentaciones/tamajon.jpg' : 'public/images/plantilla-hero-1800.webp';
    const web = await sharp(input).resize({ width: i % 3 === 2 ? 240 : 1800, height: i % 3 === 2 ? 240 : 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const thumb = await sharp(web).resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const form = new FormData();
    form.set('web', new Blob([web], { type: 'image/webp' }), 'web.webp');
    form.set('thumb', new Blob([thumb], { type: 'image/webp' }), 'thumb.webp');
    form.set('alt', `Imagen de prueba ${i + 1}`);
    const response = await fetch(`${origin}/api/admin/albums/${album.id}/photos`, { method: 'POST', headers, body: form });
    assert.equal(response.status, 201, await response.clone().text());
    const photo = await response.json(); first ??= photo.id;
  }
  await call(`/api/admin/albums/${album.id}`, 'PUT', { ...content, coverPhotoId: first || null, version: count + 1 });
  await call(`/api/admin/albums/${album.id}/publish`, 'POST');
  albums.push({ id: album.id, slug });
}
await writeFile('.wrangler/gallery-fixtures.json', JSON.stringify(albums, null, 2));
console.log('Created empty, single-photo and 20-photo albums in isolated local storage.');

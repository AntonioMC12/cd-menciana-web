type Kind = 'posts' | 'albums';
type Content = { title: string; excerpt: string; body: string; category: string; coverPhotoId: string | null; description?: string };
type Photo = { id: string; draft_alt: string; draft_position: number; draft_deleted: number; published_position: number | null };
type Item = { id: string; slug: string; version: number; published_version: number | null; draft: Content; published: Content | null; post_id?: string | null; photos?: Photo[] };
const root = document.querySelector<HTMLElement>('[data-admin]')!;
const csrf = root.dataset.csrf!;
const form = document.querySelector<HTMLFormElement>('#content-form')!;
const list = document.querySelector<HTMLElement>('#item-list')!;
const message = document.querySelector<HTMLElement>('#admin-message')!;
let kind: Kind = 'posts';
let items: Item[] = [];
let current: Item | null = null;
const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
const show = (text: string, bad = false) => { message.textContent = text; message.classList.toggle('admin-message--bad', bad); };
async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const response = await fetch(path, { method, headers: { ...(method === 'GET' ? {} : { 'x-cdm-csrf': csrf }), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const result = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
  return result;
}
function button(label: string, action: () => void): HTMLButtonElement {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.addEventListener('click', action); return el;
}
async function load() {
  show('Cargando contenido…');
  try { items = await api(`/api/admin/${kind}/`); renderList(); show(`${items.length} ${kind === 'posts' ? 'publicaciones' : 'álbumes'} en el panel.`); }
  catch (e) { show((e as Error).message, true); }
}
function renderList() {
  list.replaceChildren();
  if (!items.length) { const p = document.createElement('p'); p.textContent = 'Aún no hay contenido. Crea el primero.'; list.append(p); }
  for (const item of items) {
    const el = button(`${item.draft.title} · ${item.published ? 'Publicado' : 'Borrador'}${item.published && item.version !== item.published_version ? ' · cambios sin publicar' : ''}`, () => open(item.id));
    el.className = 'admin-list-item'; list.append(el);
  }
}
function configForm() {
  document.querySelector<HTMLElement>('#list-title')!.textContent = kind === 'posts' ? 'Noticias' : 'Álbumes';
  document.querySelector<HTMLElement>('#excerpt-label')!.firstChild!.textContent = kind === 'posts' ? 'Extracto ' : 'Descripción ';
  document.querySelector<HTMLElement>('#category-label')!.hidden = kind === 'albums';
  document.querySelector<HTMLElement>('#body-label')!.hidden = kind === 'albums';
  document.querySelector<HTMLElement>('#post-link-label')!.hidden = kind === 'posts';
  field('excerpt').required = field('category').required = field('body').required = kind === 'posts';
  document.querySelector<HTMLElement>('#photo-panel')!.hidden = kind === 'posts' || !current;
}
async function fillPostOptions() {
  const select = field('postId') as HTMLSelectElement;
  select.replaceChildren(new Option('Álbum independiente', ''));
  const posts: Item[] = await api('/api/admin/posts/');
  posts.forEach(post => select.add(new Option(post.draft.title, post.id)));
}
async function fillPhotoOptions() {
  const select = field('coverPhotoId') as HTMLSelectElement;
  select.replaceChildren(new Option('Sin portada', ''));
  if (kind === 'posts') {
    const options: { id: string; label: string }[] = await api('/api/admin/photo-options');
    options.forEach(photo => select.add(new Option(photo.label, photo.id)));
  } else current?.photos?.filter(photo => !photo.draft_deleted).forEach(photo => select.add(new Option(photo.draft_alt, photo.id)));
  if (current?.draft.coverPhotoId) select.value = current.draft.coverPhotoId;
}
async function open(id?: string) {
  current = id ? await api(`/api/admin/${kind}/${id}`) : null;
  form.reset(); configForm();
  document.querySelector<HTMLElement>('#editor')!.hidden = false;
  document.querySelector<HTMLElement>('#editor-title')!.textContent = current ? `Editar ${kind === 'posts' ? 'noticia' : 'álbum'}` : `Nuevo ${kind === 'posts' ? 'borrador' : 'álbum'}`;
  if (kind === 'albums') await fillPostOptions();
  if (current) {
    field('title').value = current.draft.title;
    field('slug').value = current.slug;
    field('excerpt').value = current.draft.excerpt || '';
    field('category').value = current.draft.category || '';
    field('body').value = current.draft.body || '';
    field('postId').value = current.post_id || '';
  }
  await fillPhotoOptions(); renderPhotos();
  const preview = document.querySelector<HTMLAnchorElement>('#preview-link')!;
  preview.hidden = !current; if (current) preview.href = `/admin/preview/${kind}/${current.id}/`;
  document.querySelector<HTMLButtonElement>('#publish')!.disabled = !current;
  document.querySelector<HTMLButtonElement>('#unpublish')!.disabled = !current?.published;
  document.querySelector<HTMLButtonElement>('#delete-item')!.disabled = !current;
}
function payload(): Record<string, unknown> {
  return { title: field('title').value, slug: field('slug').value, excerpt: field('excerpt').value, description: kind === 'albums' ? field('excerpt').value : undefined, category: field('category').value, body: field('body').value, postId: field('postId').value, coverPhotoId: field('coverPhotoId').value || null, version: current?.version };
}
form.addEventListener('submit', async event => {
  event.preventDefault(); show('Guardando borrador…');
  try {
    const result = await api(current ? `/api/admin/${kind}/${current.id}` : `/api/admin/${kind}/`, current ? 'PUT' : 'POST', payload());
    const id = current?.id || result.id; await load(); await open(id); show('Borrador guardado. La web pública no ha cambiado.');
  } catch (e) { show((e as Error).message, true); }
});
async function action(name: 'publish' | 'unpublish') {
  if (!current) return;
  show(name === 'publish' ? 'Publicando…' : 'Retirando…');
  try { await api(`/api/admin/${kind}/${current.id}/${name}`, 'POST'); const id = current.id; await load(); await open(id); show(name === 'publish' ? 'Contenido publicado.' : 'Contenido retirado de la web.'); }
  catch (e) { show((e as Error).message, true); }
}
document.querySelector('#publish')!.addEventListener('click', () => action('publish'));
document.querySelector('#unpublish')!.addEventListener('click', () => { if (confirm('¿Retirar este contenido de la web pública?')) action('unpublish'); });
document.querySelector('#delete-item')!.addEventListener('click', async () => {
  if (!current || !confirm('¿Eliminar este contenido y sus fotografías? Esta acción no se puede deshacer.')) return;
  try { await api(`/api/admin/${kind}/${current.id}`, 'DELETE'); current = null; document.querySelector<HTMLElement>('#editor')!.hidden = true; await load(); show('Contenido eliminado.'); }
  catch (e) { show((e as Error).message, true); }
});
document.querySelector('#new-item')!.addEventListener('click', () => open().catch(e => show(e.message, true)));
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(tab => tab.addEventListener('click', () => {
  kind = tab.dataset.tab as Kind; current = null; document.querySelector<HTMLElement>('#editor')!.hidden = true;
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(x => x.setAttribute('aria-pressed', String(x === tab)));
  load();
}));
function renderPhotos() {
  const panel = document.querySelector<HTMLElement>('#photo-list')!; panel.replaceChildren();
  if (!current?.photos?.length) { panel.textContent = 'Aún no hay fotografías.'; return; }
  for (const photo of current.photos.filter(x => !x.draft_deleted)) {
    const row = document.createElement('div'); row.className = 'admin-photo';
    const img = document.createElement('img'); img.src = `/admin/media/${photo.id}/thumb`; img.alt = photo.draft_alt; img.width = 100; img.height = 75;
    const alt = document.createElement('input'); alt.value = photo.draft_alt; alt.setAttribute('aria-label', 'Descripción de la foto'); alt.maxLength = 240;
    const order = document.createElement('input'); order.type = 'number'; order.value = String(photo.draft_position); order.min = '0'; order.max = '100'; order.setAttribute('aria-label', 'Orden de la foto');
    row.append(img, alt, order, button('Guardar foto', async () => { try { await api(`/api/admin/photos/${photo.id}`, 'PUT', { alt: alt.value, position: Number(order.value), version: current!.version }); await open(current!.id); show('Fotografía actualizada. Publica el álbum para mostrar cambios.'); } catch (e) { show((e as Error).message, true); } }), button('Eliminar', async () => { if (!confirm('¿Eliminar esta foto del borrador?')) return; try { await api(`/api/admin/photos/${photo.id}`, 'DELETE', { version: current!.version }); await open(current!.id); show('Foto eliminada del borrador. Publica el álbum para aplicar el cambio.'); } catch (e) { show((e as Error).message, true); } }));
    panel.append(row);
  }
}
async function resize(file: File, longest: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width > 12000 || bitmap.height > 12000) throw new Error('La imagen supera 12.000 píxeles por lado.');
    const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob?.type === 'image/webp' ? resolve(blob) : reject(new Error('Este navegador no puede generar WebP.')), 'image/webp', .82));
  } finally { bitmap.close(); }
}
function upload(formData: FormData, progress: (n: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', `/api/admin/albums/${current!.id}/photos`); xhr.setRequestHeader('x-cdm-csrf', csrf);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else { try { reject(new Error(JSON.parse(xhr.responseText).error)); } catch { reject(new Error('No se pudo subir la foto.')); } } };
    xhr.onerror = () => reject(new Error('Error de red durante la subida.')); xhr.send(formData);
  });
}
async function uploadOne(file: File, row: HTMLElement) {
  try {
    if (file.size > 20_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Usa JPG, PNG o WebP de hasta 20 MB.');
    row.textContent = `${file.name}: procesando…`;
    const web = await resize(file, 2000), thumb = await resize(file, 480);
    const data = new FormData(); data.set('web', web, 'web.webp'); data.set('thumb', thumb, 'thumb.webp'); data.set('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    await upload(data, n => row.textContent = `${file.name}: ${n}%`);
    row.textContent = `${file.name}: subida completa`;
    await open(current!.id);
  } catch (e) { row.replaceChildren(document.createTextNode(`${file.name}: ${(e as Error).message} `), button('Reintentar', () => uploadOne(file, row))); }
}
document.querySelector<HTMLInputElement>('#photo-files')!.addEventListener('change', async event => {
  const files = [...((event.currentTarget as HTMLInputElement).files || [])];
  if (!current) { show('Guarda primero el álbum.', true); return; }
  const list = document.querySelector<HTMLElement>('#upload-list')!;
  for (const file of files) { const row = document.createElement('p'); list.append(row); await uploadOne(file, row); }
});
load();

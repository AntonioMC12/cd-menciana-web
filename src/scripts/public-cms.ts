type Post = { id: string; slug: string; title: string; excerpt: string; body: string[]; category: string; coverPhotoId: string | null; publishedAt?: string };
type Album = { id: string; slug: string; title: string; description: string; coverPhotoId: string | null; photos?: { id: string; alt: string; width: number; height: number }[] };
const api = (import.meta.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const link = (path: string) => `${base}${path}`;
const root = document.querySelector<HTMLElement>('[data-cms-root]');
const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
const el = (tag: string, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const photo = (id: string, size: 'thumb' | 'web' = 'thumb') => `${api}/media/${encodeURIComponent(id)}/${size}`;
async function get<T>(path: string): Promise<T> {
  if (!api) throw new Error('La conexión con las publicaciones aún no está configurada.');
  const response = await fetch(`${api}${path}`, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error(response.status === 404 ? 'Contenido no encontrado.' : 'No se pudo cargar el contenido.');
  return response.json() as Promise<T>;
}
const state = (message: string) => el('p', 'empty-panel', message);
const postCard = (post: Post) => {
  const card = el('article', 'news-card');
  const href = link(`/noticias/detalle/?slug=${encodeURIComponent(post.slug)}`);
  const visual = el('a', 'news-card__visual') as HTMLAnchorElement; visual.href = href;
  if (post.coverPhotoId) { const img = el('img', 'news-card__image') as HTMLImageElement; img.src = photo(post.coverPhotoId); img.alt = ''; img.loading = 'lazy'; visual.append(img); }
  else visual.append(el('span', 'news-card__visual-index', 'CD MENCIANA'));
  const body = el('div', 'news-card__body');
  const meta = el('div', 'news-card__meta'); meta.append(el('span', '', post.category), el('span', '', post.publishedAt || ''));
  const title = el('h3'); const titleLink = el('a', '', post.title) as HTMLAnchorElement; titleLink.href = href; title.append(titleLink);
  const read = el('a', 'text-link', 'Leer artículo →') as HTMLAnchorElement; read.href = href;
  body.append(meta, title, el('p', '', post.excerpt), read); card.append(visual, body); return card;
};
const albumCard = (album: Album) => {
  const card = el('article', 'news-card');
  const href = link(`/galerias/detalle/?slug=${encodeURIComponent(album.slug)}`);
  const visual = el('a', 'news-card__visual') as HTMLAnchorElement; visual.href = href;
  if (album.coverPhotoId) { const img = el('img', 'news-card__image') as HTMLImageElement; img.src = photo(album.coverPhotoId); img.alt = ''; img.loading = 'lazy'; visual.append(img); }
  else visual.append(el('span', 'news-card__visual-index', 'CD MENCIANA'));
  const body = el('div', 'news-card__body'); const title = el('h3'); const a = el('a', '', album.title) as HTMLAnchorElement; a.href = href; title.append(a);
  body.append(title, el('p', '', album.description)); card.append(visual, body); return card;
};
async function render() {
  if (!root) return;
  const mode = root.dataset.cmsRoot;
  const params = new URLSearchParams(location.search);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const slug = params.get('slug');
  root.replaceChildren(state('Cargando contenido…'));
  try {
    if (mode === 'home') {
      const data = await get<{ items: Post[] }>('/api/posts?page=1');
      root.replaceChildren(data.items.length ? el('div', 'news-grid') : state('Aún no hay noticias publicadas.'));
      if (data.items.length) root.firstElementChild!.append(...data.items.slice(0, 3).map(postCard));
    } else if (mode === 'posts' || mode === 'albums') {
      const post = mode === 'albums' ? params.get('post') : null;
      const query = `?page=${page}${post ? `&post=${encodeURIComponent(post)}` : ''}`;
      const data = await get<{ items: (Post | Album)[]; more: boolean }>(`/api/${mode}${query}`);
      const grid = el('div', 'news-grid'); grid.append(...data.items.map(x => mode === 'posts' ? postCard(x as Post) : albumCard(x as Album)));
      const pager = el('nav', 'pager'); pager.setAttribute('aria-label', 'Páginas');
      const pageLink = (label: string, number: number) => { const a = el('a', '', label) as HTMLAnchorElement; a.href = `?page=${number}${post ? `&post=${encodeURIComponent(post)}` : ''}`; return a; };
      if (page > 1) pager.append(pageLink('← Anteriores', page - 1));
      if (data.more) pager.append(pageLink('Siguientes →', page + 1));
      root.replaceChildren(data.items.length ? grid : state(mode === 'posts' ? 'Aún no hay noticias publicadas.' : 'Aún no hay galerías publicadas.'), pager);
    } else if (mode === 'post' && slug) {
      const post = await get<Post>(`/api/posts/${encodeURIComponent(slug)}`);
      document.title = `${post.title} | CD Menciana`; if (canonical) canonical.href = location.href; root.replaceChildren();
      const head = el('header', 'article-hero'); const inner = el('div', 'container article-hero__inner');
      const back = el('a', 'back-link', '← Todas las noticias') as HTMLAnchorElement; back.href = link('/noticias/');
      inner.append(back, el('p', 'eyebrow eyebrow--gold', `${post.category} · ${post.publishedAt || ''}`), el('h1', '', post.title), el('p', '', post.excerpt)); head.append(inner);
      const layout = el('div', 'container article-layout'); const body = el('div', 'article-content');
      if (post.coverPhotoId) { const img = el('img', 'article-image') as HTMLImageElement; img.src = photo(post.coverPhotoId, 'web'); img.alt = 'Portada de la noticia'; body.append(img); }
      body.append(...post.body.map(p => el('p', '', p)));
      const galleries = el('a', 'text-link', 'Ver galerías de la noticia →') as HTMLAnchorElement; galleries.href = link(`/galerias/?post=${encodeURIComponent(post.id)}`); body.append(galleries);
      layout.append(body); root.append(head, layout);
    } else if (mode === 'album' && slug) {
      const album = await get<Album>(`/api/albums/${encodeURIComponent(slug)}`);
      document.title = `${album.title} | CD Menciana`; if (canonical) canonical.href = location.href; root.replaceChildren();
      const head = el('section', 'page-hero'); const inner = el('div', 'container');
      const back = el('a', 'back-link', '← Todas las galerías') as HTMLAnchorElement; back.href = link('/galerias/');
      inner.append(back, el('h1', '', album.title), el('p', '', album.description)); head.append(inner);
      const section = el('section', 'section'); const container = el('div', 'container'); const grid = el('div', 'gallery-grid');
      for (const item of album.photos || []) { const a = el('a') as HTMLAnchorElement; a.href = photo(item.id, 'web'); a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', `Abrir imagen: ${item.alt}`); const img = el('img') as HTMLImageElement; img.src = photo(item.id); img.alt = item.alt; img.width = item.width; img.height = item.height; img.loading = 'lazy'; a.append(img); grid.append(a); }
      container.append(grid); section.append(container); root.append(head, section);
    } else root.replaceChildren(state('Contenido no encontrado.'));
  } catch (cause) { root.replaceChildren(state((cause as Error).message)); }
}
void render();

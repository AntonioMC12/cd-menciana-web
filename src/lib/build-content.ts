// Public CMS content is fetched at build time so search engines and visitors
// receive the same article and gallery HTML without running JavaScript.
const api = (process.env.PUBLIC_CMS_API_URL || '').replace(/\/$/, '');

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  coverPhotoId: string | null;
  publishedAt?: string;
};

export type PublicAlbum = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverPhotoId: string | null;
  publishedAt?: string;
  photos?: { id: string; alt: string; width: number; height: number }[];
};

type List<T> = { items: T[]; more: boolean };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${api}${path}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`No se pudo obtener ${path} del CMS público (${response.status}).`);
  return response.json() as Promise<T>;
}

async function allPublished<T extends { slug: string }>(kind: 'posts' | 'albums'): Promise<T[]> {
  if (!api) return [];
  const items: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const result = await request<List<T>>(`/api/${kind}?page=${page}`);
    if (!Array.isArray(result.items) || typeof result.more !== 'boolean') throw new Error(`Respuesta inválida del CMS: ${kind}.`);
    for (const item of result.items) {
      if (!slugPattern.test(item.slug)) throw new Error(`Slug inválido en ${kind}.`);
      items.push(item);
    }
    if (!result.more) return items;
  }
  throw new Error(`La paginación de ${kind} excede el límite de seguridad.`);
}

let postsPromise: Promise<PublicPost[]> | undefined;
let albumsPromise: Promise<PublicAlbum[]> | undefined;
export const getPublicPosts = () => postsPromise ??= allPublished<PublicPost>('posts');
export const getPublicAlbums = () => albumsPromise ??= allPublished<PublicAlbum>('albums');
export const getPublicPost = (slug: string) => request<PublicPost>(`/api/posts/${encodeURIComponent(slug)}`);
export const getPublicAlbum = (slug: string) => request<PublicAlbum>(`/api/albums/${encodeURIComponent(slug)}`);
export const publicPhoto = (id: string, size: 'thumb' | 'web' | 'download' = 'web') => `${api}/media/${encodeURIComponent(id)}/${size}`;

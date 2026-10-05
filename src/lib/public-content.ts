import type { Article } from '../data/types';
import { parseBody, photoUrl, publishedList, type Content, type Row } from './cms';
export function articleFromRow(row: Row): Article {
  const data = JSON.parse(row.published_json || '{}') as Content;
  return { slug: row.published_slug || row.slug, title: data.title, excerpt: data.excerpt, body: parseBody(data.body), category: data.category, image: data.coverPhotoId ? photoUrl(data.coverPhotoId) : undefined, publishedAt: row.published_at?.slice(0, 10), status: 'confirmed' };
}
export async function newsPage(page: number, limit = 9): Promise<{ items: Article[]; more: boolean }> {
  const rows = await publishedList('posts', page, limit + 1, limit);
  return { items: rows.slice(0, limit).map(articleFromRow), more: rows.length > limit };
}
export async function homeNews(): Promise<Article[]> {
  const rows = await publishedList('posts', 1, 3);
  return rows.map(articleFromRow);
}
export async function galleryPage(page: number, limit = 9): Promise<{ items: Row[]; more: boolean }> {
  const rows = await publishedList('albums', page, limit + 1, limit);
  return { items: rows.slice(0, limit), more: rows.length > limit };
}

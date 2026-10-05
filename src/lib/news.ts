import type { PublicPost } from './build-content';
import { publicPhoto } from './build-content';
import type { Article } from '../data/types';
export const NEWS_PAGE_SIZE = 9;
export const newsPagePath = (page: number) => page === 1 ? '/noticias/' : `/noticias/pagina/${page}/`;
export function newsDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? undefined : new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' }).format(date);
}
export function newsArticle(post: PublicPost): Article {
  return { ...post, image: post.coverPhotoId ? publicPhoto(post.coverPhotoId, 'thumb') : undefined, status: 'confirmed' };
}
export function relatedNews(posts: PublicPost[], post: PublicPost): PublicPost[] {
  const others = posts.filter(item => item.slug !== post.slug);
  return [...others.filter(item => post.category && item.category === post.category), ...others.filter(item => !post.category || item.category !== post.category)].slice(0, 3);
}

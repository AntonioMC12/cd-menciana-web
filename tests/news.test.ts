import { describe, expect, it } from 'vitest';
import { newsDate, relatedNews } from '../src/lib/news';
import type { PublicPost } from '../src/lib/build-content';
const post = (slug: string, category = 'Club'): PublicPost => ({ id: slug, slug, title: slug, category, excerpt: '', body: [], coverPhotoId: null });
describe('news presentation', () => {
  it('prioritizes the category, fills with recent news and excludes the open article', () => {
    const current = post('current');
    expect(relatedNews([post('recent-other', 'Primer equipo'), current, post('same-category'), post('older-other', 'Filial')], current).map(item => item.slug)).toEqual(['same-category', 'recent-other', 'older-other']);
    expect(relatedNews([current], current)).toEqual([]);
  });
  it('uses recent news when no category exists', () => {
    const current = post('current', '');
    expect(relatedNews([current, post('recent'), post('older')], current).map(item => item.slug)).toEqual(['recent', 'older']);
  });
  it('formats legacy dates and timestamps, omitting unavailable dates', () => {
    expect(newsDate('2024-09-11')).toBe('11 de septiembre de 2024');
    expect(newsDate('2026-10-05T23:30:00Z')).toBe('6 de octubre de 2026');
    expect(newsDate()).toBeUndefined();
    expect(newsDate('invalid')).toBeUndefined();
  });
});

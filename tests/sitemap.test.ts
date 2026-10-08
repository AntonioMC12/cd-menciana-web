import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { publicSitemapOptions, sitemapPolicy, validatePublicSitemap } from '../scripts/sitemap-options.mjs';

const origin = 'https://cdmenciana.es';
const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });

async function fixture(contactHead = '', duplicate = false) {
  const dir = await mkdtemp(join(tmpdir(), 'menciana-sitemap-'));
  temporaryDirectories.push(dir);
  await mkdir(join(dir, 'contacto'));
  await writeFile(join(dir, 'index.html'), `<head><link rel="canonical" href="${origin}/"></head><body>Inicio</body>`);
  await writeFile(join(dir, 'contacto', 'index.html'), `<head>${contactHead || `<link href="${origin}/contacto/" rel="canonical">`}</head><body>Contacto</body>`);
  await writeFile(join(dir, 'sitemap-index.xml'), `<sitemapindex><sitemap><loc>${origin}/sitemap-pages.xml</loc></sitemap></sitemapindex>`);
  await writeFile(join(dir, 'sitemap-pages.xml'), `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/contacto/</loc></url>${duplicate ? `<url><loc>${origin}/contacto/</loc></url>` : ''}</urlset>`);
  return dir;
}

describe('public sitemap', () => {
  it('includes public sections, published detail URLs and archive pagination', () => {
    const { filter } = sitemapPolicy(origin);
    for (const path of ['/', '/contacto/', '/noticias/cronica-del-partido/', '/galerias/partido-2/', '/noticias/pagina/2/', '/noticias/pagina/12/']) expect(filter(origin + path)).toBe(true);
  });
  it('excludes internal, legacy, duplicate and foreign URLs', () => {
    const { filter } = sitemapPolicy(origin);
    for (const path of ['/admin/', '/api/posts/', '/tienda/stock/', '/release-campaign/', '/release-campaign/editables/portada.html', '/404.html', '/noticias/detalle/', '/galerias/detalle/', '/noticias/pagina/1/', '/noticias/pagina/02/', '/contacto/?utm_source=test', '/contacto/#correo']) expect(filter(origin + path)).toBe(false);
    expect(filter('https://cms.cdmenciana.es/')).toBe(false);
    expect(filter('http://cdmenciana.es/')).toBe(false);
  });
  it('respects a deployment under a base path', () => {
    const { filter } = sitemapPolicy('https://example.com', '/club-web/');
    expect(filter('https://example.com/club-web/')).toBe(true);
    expect(filter('https://example.com/club-web/noticias/cronica/')).toBe(true);
    expect(filter('https://example.com/noticias/cronica/')).toBe(false);
    expect(filter('https://example.com/club-web-otro/contacto/')).toBe(false);
  });
  it('puts news and galleries in separate groups', () => {
    const options = publicSitemapOptions(origin);
    const news = { url: `${origin}/noticias/cronica/` };
    expect(options.chunks.noticias(news)).toEqual(news);
    expect(options.chunks.galerias(news)).toBeUndefined();
    expect(options.chunks.noticias({ url: `${origin}/club/` })).toBeUndefined();
  });
  it('validates canonical pages regardless of HTML attribute order', async () => {
    expect(await validatePublicSitemap(await fixture(), origin)).toEqual({ maps: 1, pages: 2 });
  });
  it('fails the build for noindex pages', async () => {
    const dir = await fixture(`<meta content="noindex, follow" name="robots"><link rel="canonical" href="${origin}/contacto/">`);
    await expect(validatePublicSitemap(dir, origin)).rejects.toThrow('Non-indexable');
  });
  it('fails the build for a canonical mismatch', async () => {
    await expect(validatePublicSitemap(await fixture(`<link rel="canonical" href="${origin}/club/">`), origin)).rejects.toThrow('canonical');
  });
  it('fails the build for duplicate URLs', async () => {
    await expect(validatePublicSitemap(await fixture('', true), origin)).rejects.toThrow('duplicate');
  });
});

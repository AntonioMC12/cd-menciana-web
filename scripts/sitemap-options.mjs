import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sections = new Set(['/', '/club/', '/equipos/', '/calendario/', '/noticias/', '/galerias/', '/cdm-tv/', '/patrocinadores/', '/tienda/', '/contacto/']);

export function sitemapPolicy(site, base = '/') {
  const root = new URL(`${base.replace(/\/$/, '')}/`, site);
  const relativePath = (value) => {
    const url = new URL(value);
    if (url.origin !== root.origin || url.search || url.hash || !url.pathname.startsWith(root.pathname)) return undefined;
    return `/${url.pathname.slice(root.pathname.length)}`;
  };
  const filter = (value) => {
    const path = relativePath(value);
    if (!path) return false;
    if (sections.has(path)) return true;
    if (/^\/noticias\/pagina\/(?:[2-9]|[1-9]\d+)\/$/.test(path)) return true;
    return /^\/(?:noticias|galerias)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(path)
      && !path.endsWith('/detalle/');
  };
  return { root, relativePath, filter };
}

export function publicSitemapOptions(site, base = '/') {
  const policy = sitemapPolicy(site, base);
  return {
    filter: policy.filter,
    // Separate maps allow Search Console to report each content group.
    chunks: {
      noticias: item => policy.relativePath(item.url)?.startsWith('/noticias/') ? item : undefined,
      galerias: item => policy.relativePath(item.url)?.startsWith('/galerias/') ? item : undefined,
    },
    namespaces: { news: false, image: false, video: false, xhtml: false },
    // Do not invent lastmod dates or add priority/changefreq (ignored by Google).
  };
}

const locations = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(match => [match[1].toLowerCase(), match[2]]));

export async function validatePublicSitemap(directory, site, base = '/') {
  const policy = sitemapPolicy(site, base);
  const buildRoot = resolve(directory);
  const index = await readFile(resolve(buildRoot, 'sitemap-index.xml'), 'utf8');
  const maps = locations(index);
  if (!maps.length || new Set(maps).size !== maps.length) throw new Error('Sitemap index is empty or contains duplicate maps.');
  const seen = new Set();
  for (const map of maps) {
    const relative = policy.relativePath(map);
    if (!relative || !/^\/sitemap-[a-z0-9-]+\.xml$/.test(relative)) throw new Error(`Unexpected sitemap: ${map}`);
    const xml = await readFile(resolve(buildRoot, relative.slice(1)), 'utf8');
    const urls = locations(xml);
    if (!urls.length) throw new Error(`Empty sitemap: ${map}`);
    for (const url of urls) {
      if (!policy.filter(url) || seen.has(url)) throw new Error(`Excluded or duplicate sitemap URL: ${url}`);
      seen.add(url);
      const pagePath = resolve(buildRoot, `.${policy.relativePath(url)}`, 'index.html');
      if (!pagePath.startsWith(`${buildRoot}${sep}`)) throw new Error(`Invalid sitemap path: ${url}`);
      const html = await readFile(pagePath, 'utf8');
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
      const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
      if (metas.some(meta => /^(robots|googlebot)$/i.test(meta.name || '') && /\b(noindex|none)\b/i.test(meta.content || ''))) throw new Error(`Non-indexable sitemap URL: ${url}`);
      const canonical = [...head.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0])).find(link => link.rel === 'canonical');
      if (canonical?.href !== url) throw new Error(`Sitemap URL does not match its canonical: ${url}`);
    }
  }
  if (!seen.has(policy.root.href)) throw new Error('Homepage is missing from sitemap.');
  return { maps: maps.length, pages: seen.size };
}

export function sitemapValidation(site, base = '/') {
  return {
    name: 'validate-public-sitemap',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const result = await validatePublicSitemap(fileURLToPath(dir), site, base);
        logger.info(`Validated ${result.pages} canonical pages in ${result.maps} sitemaps.`);
      },
    },
  };
}

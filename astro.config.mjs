import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { publicSitemapOptions, sitemapValidation } from './scripts/sitemap-options.mjs';

const site = process.env.PUBLIC_SITE_URL || 'https://cdmenciana.es';
const base = process.env.PUBLIC_SITE_BASE || '/';

export default defineConfig({
  site,
  base,
  devToolbar: { enabled: false },
  integrations: [sitemap(publicSitemapOptions(site, base)), sitemapValidation(site, base)],
});

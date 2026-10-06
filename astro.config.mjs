import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://cdmenciana.es',
  base: process.env.PUBLIC_SITE_BASE || '/',
  devToolbar: { enabled: false },
  integrations: [sitemap({
    filter: (page) => !['/404.html', '/noticias/detalle/', '/galerias/detalle/', '/release-campaign', '/release-campaign/', '/tienda', '/tienda/'].some(path => new URL(page).pathname.endsWith(path)),
  })],
});

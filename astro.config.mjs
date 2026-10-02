import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://antoniomc12.github.io',
  base: process.env.PUBLIC_SITE_BASE || '/cd-menciana-web',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
});

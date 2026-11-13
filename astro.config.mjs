import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Set SITE_URL in Netlify (Site settings > Environment variables) once the
// domain is live; until then the Netlify address is used for canonical links.
const site = process.env.SITE_URL || 'https://regent-exterior.netlify.app';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [react(), sitemap({ filter: (p) => !/\/(model|thank-you)\/$/.test(p) })],
  build: { inlineStylesheets: 'auto' },
});

import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /thank-you/\nDisallow: /quote-builder/\nDisallow: /holiday-lighting/book/\n\nSitemap: ${new URL('/sitemap-index.xml', site)}\n`, { headers: { 'Content-Type': 'text/plain' } });

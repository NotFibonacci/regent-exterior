# Regent Exterior Services website

Astro static site with a three.js lighting configurator on the home page.

## Deploy to Netlify
- **From GitHub (recommended):** connect this repository in Netlify. Build settings come from `netlify.toml`.
- **Drag and drop:** run `npm install && npm run build`, then drop the `dist` folder on the Netlify dashboard.

After the first deploy:
1. **Forms:** Site configuration → Forms → enable form detection, then redeploy. Two forms are collected: `request` (design visits) and `holiday-quote` (holiday estimates).
2. **Email notifications:** Forms → Form notifications → add email notification to Regentexteriorservices@gmail.com for each form.
3. **Domain:** add the domain, then set the environment variable `SITE_URL` to it (for example `https://regentexteriorservices.com`) and redeploy.

## Editing
- Business details (phone, address): `src/config/site.ts`. Empty values are hidden, never invented.
- Holiday prices: `src/config/pricing.ts`.
- Division pages: `src/data/divisions.ts`. County pages: `src/data/counties.ts`.
- Night-scene images are rebuilt from the mockups with `tools/build_night_layers.py` (Python, OpenCV, Pillow).

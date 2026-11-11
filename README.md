# KaziHub Marketplace

React/Vite frontend with a Supabase backend, configured for deployment from GitHub to Netlify.

## Local development

1. Install Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and populate the Supabase project URL and **publishable/anon** key (never use a service-role or secret key in the frontend).
4. Run `npm run dev`.

## Netlify (existing site: kazihub-marketplace)

- Repository: `willespanyol/kazihub-marketplace`
- Branch: `main`
- Base directory: repository root
- Build command: `npm run build`
- Publish directory: `dist`
- SPA routes: handled by `netlify.toml`
- Node.js: choose Node 22 or a compatible newer LTS version in Netlify

In **Netlify > Project configuration > Environment variables**, add:

- `VITE_SUPABASE_URL` — Supabase project API URL
- `VITE_SUPABASE_ANON_KEY` — publishable (or legacy anon) key

Vite embeds variables with the `VITE_` prefix into browser JavaScript. These variables must not contain secrets. Netlify must have them at build time; environment values in `.env.local` are intentionally excluded from the repository.

To retain the current domain and project settings, link the GitHub repository from the **existing** Netlify project (`kazihub-marketplace`). Do not create a new Netlify site.

## Deployment

Push to `main`; after Netlify is linked, the existing site will build and deploy automatically. Verify authentication, marketplace listings, and client-side routes after deployment.

The Truehost/cPanel deployment artifacts have been excluded; no Apache `.htaccess` configuration is required on Netlify.

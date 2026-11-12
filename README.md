# KaziHub Marketplace

React/Vite frontend with a Supabase backend, configured for deployment from GitHub to Netlify.

## Local development

1. Install Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+).
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and populate the Supabase project URL and **publishable/anon** key (never use a service-role or secret key in the frontend).
4. Run `npm run dev`.

## Vercel (existing KaziHub project)

- Repository: `willespanyol/kazihub-marketplace`
- Production branch: `main`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as project environment variables. Never place secret/service-role keys in variables with a `VITE_` prefix.
- Configure SPA fallback routing in `vercel.json`.
- Preserve the existing Vercel project and its `kazihub.site` domain.

## Deployment

Push to `main`; if the existing Vercel project has GitHub integration and automatic production deployments enabled, Vercel builds the commit. Check the actual Vercel deployment and test authentication, marketplace listings, and client-side routes.

The Truehost/cPanel and Netlify deployment artifacts are not used for production.

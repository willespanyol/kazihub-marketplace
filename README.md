# KaziHub Marketplace

React/Vite marketplace frontend backed by Supabase.

## Netlify deployment

Use the **existing** Netlify project `kazihub-marketplace` (custom domain `kazihub.site`), not a new site.

- Repository: `willespanyol/kazihub-marketplace`
- Production branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirects: `netlify.toml`

In Netlify **Project configuration → Environment variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's Supabase URL and **publishable/anon** key. Never put a service-role key in Vite variables. Values must be available during the build.

## Local development

Run `npm ci`, copy `.env.example` to `.env.local`, provide the Supabase settings, and run `npm run dev`.

**Source synchronization:** The original local project ZIP includes uncommitted application changes. Ensure the prepared clean source ZIP is pushed to this repository before enabling production deployment; the GitHub checkout may otherwise be older than the local project.

Truehost and Apache deployment bundles are not required on Netlify.

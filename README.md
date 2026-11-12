# KaziHub Marketplace

React/Vite frontend with a Supabase backend, deployed from GitHub to Vercel.

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

## Quality gates
- `npm test` checks route/export regressions, public/admin path separation, basic authentication and configuration invariants.
- `npm run build` verifies the production build.
- GitHub Actions runs tests and the build on pushes and pull requests to `main`.
- These are **static regression tests**, not a substitute for browser-based checkout tests, real account testing, or a security assessment. Configure branch protection before claiming they block deployments.

## Payments and transaction records
- Manual payment confirmation remains the only operational payment method until a verified provider is integrated.
- The database trigger `kazihub_record_order_financial_event` creates immutable-to-client audit events in `public.order_financial_events` whenever orders are created or payment/payout statuses change.
- Only the active platform administrator may read financial audit events using RLS; neither the buyer nor seller may insert or alter audit events.
- Financial audit events document application state changes. They **do not** verify settlement, constitute escrow, or represent a bank/crypto ledger.
- Before activating payment automation, configure a supported processor, idempotent signed webhooks, refunds, payout reconciliation, provider-side receipt verification and legal treatment of held funds.

## Transactional notifications
- Important in-app notification events are now enqueued idempotently in `kazihub_internal.notification_delivery_outbox`.
- This outbox contains notification IDs and recipient IDs, not credentials. It is inaccessible to ordinary users.
- **Email is not being sent yet.** A server-side worker must be added with a verified sending domain and credentials held in a secret manager, not Vite environment variables.
- The worker must authenticate as a trusted service, resolve the recipient's verified email in Supabase Auth, handle retries and respect notification preferences. It must never send private message bodies to external notification channels.
- WhatsApp Business templates and approved API credentials are separate; the outbox currently queues email only.

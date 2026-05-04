# Health Benefits Shop

A privacy-first, "Shop by Need" marketplace for health-related OTC products. Users maximize a monthly or quarterly allowance by building curated bundles that fit within budget—without ever stating a diagnosis.

## Tech Stack

- **Next.js 14+** (App Router), TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Neon Postgres** + **Drizzle ORM**
- **Stripe** (Checkout + Subscriptions)
- **Vercel** deployment

## Source repository

The canonical Git remote for this app is **[github.com/endesignllc/health](https://github.com/endesignllc/health)**. Create **new** Vercel projects by importing that repo only. Do **not** link production `healthbenefits.shop` to legacy **Foundry** or other superseded repositories.

## Privacy Posture

- **No third-party tracking**: No Google Analytics, Meta Pixel, Hotjar, FullStory, or similar
- **No need-category logging**: Need selections are not logged server-side
- **No IP storage**: App-level logging does not store IP addresses
- **No PHI**: We never ask "what diagnosis do you have"
- **First-party analytics**: Optional, off by default; aggregate only, cookie-less

## Quick Start

### 0. One-shot local test environment

From the project root (with `.env.local` configured, at least `DATABASE_URL`):

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open **http://localhost:3009**. For checkout redirects in dev, set `NEXT_PUBLIC_BASE_URL=http://localhost:3009` in `.env.local` (optional; the app falls back to the request host).

For **Google sign-in**, copy `.env.example` → `.env.local` and fill `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ALLOWED_EMAILS`. While the OAuth app is in **Testing** in Google Cloud, every signer-in must also be listed under **Google Auth Platform → Audience → Test users** (see section 7 below).

### 1. Clone and install

```bash
git clone https://github.com/endesignllc/health.git
cd health
npm install
# or: pnpm install
```

### 2. Neon Postgres

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Add to `.env.local`:

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### 3. Run migrations

```bash
npm run db:push
# or for migrations: npm run db:migrate
```

### 4. Seed the database

```bash
npm run db:seed
```

### 5. Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your **Secret Key** and **Publishable Key**
3. Add to `.env.local`:

```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

4. For webhooks (local testing):

```bash
stripe listen --forward-to localhost:3009/api/webhook/stripe
```

5. Add the webhook signing secret to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 6. Admin

Set an admin token for `/admin` access:

```env
ADMIN_TOKEN="your-secret-token"
```

### 7. Google sign-in (private preview)

The site gates most routes behind Auth.js + Google OAuth. Full console steps live in [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) §2; locally you need:

```env
AUTH_SECRET="<openssl rand -base64 32>"
AUTH_URL="http://localhost:3009"
AUTH_GOOGLE_ID="…"
AUTH_GOOGLE_SECRET="…"
ALLOWED_EMAILS="you@example.com,collaborator@example.com"
```

**Two separate allowlists:**

1. **Google Cloud — Test users** (when publishing status is **Testing**): **Google Auth Platform → Audience → Test users**. Any Google account not listed here is blocked by Google before your app runs.
2. **This app — `ALLOWED_EMAILS`**: Emails must appear here too, or users are sent to `/access-denied` after Google succeeds.

In **Google Cloud → Credentials → OAuth client**, add **Authorized redirect URIs** for each host you use, e.g. `http://localhost:3009/api/auth/callback/google` and, if you open the site via loopback IP, `http://127.0.0.1:3009/api/auth/callback/google`.

### 8. Run locally

```bash
npm run dev
# or: pnpm dev
```

Open [http://localhost:3009](http://localhost:3009) (dev server uses port **3009** by default). Use `npm run dev:lan` only if you need other devices on your network to reach the machine; then set `AUTH_URL` to a browser-reachable base URL (see `.env.example`).

**Note**: For `npm run build`, ensure `DATABASE_URL` is set (e.g. in `.env.local`). Vercel sets this automatically from your project env vars.

## Vercel Deployment

1. Push to GitHub and import the project in Vercel
2. Add environment variables:
   - `DATABASE_URL` (Neon)
   - Google auth: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAILS`, `AUTH_URL` (production site origin, e.g. `https://healthbenefits.shop`)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ADMIN_TOKEN`
   - `NEXT_PUBLIC_BASE_URL` (same public origin as `AUTH_URL`, e.g. `https://your-app.vercel.app`)
3. Deploy

**Migrations**: Run before first deploy or in a post-deploy step:

```bash
npm run db:push
```

## Stripe Setup (Production)

1. Create products/prices in Stripe for subscription bundles (or let the app create them on first subscription)
2. Add webhook endpoint: `https://your-domain.com/api/webhook/stripe`
3. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## App Structure

| Route | Description |
|-------|-------------|
| `/` | Home, CTA to Build My Bundle |
| `/build` | Assessment wizard (budget, need, goals) |
| `/bundles` | 3 recommended bundles (Essential, Balanced, Comprehensive) |
| `/bundle/[id]` | Bundle editor (swap items, stay under budget) |
| `/cart` | Cart with budget meter, subscribe toggle, checkout |
| `/checkout/success` | Post-checkout thank you |
| `/privacy`, `/terms`, `/disclaimer` | Legal pages |
| `/admin` | Admin dashboard (products, needs, rules, orders) |

## Scripts

- `npm run dev` - Start dev server (localhost; preferred for OAuth redirects)
- `npm run dev:lan` - Dev server bound to `0.0.0.0` for LAN devices; set `AUTH_URL` to a reachable URL (see `.env.example`)
- `npm run build` - Build for production
- `npm run db:push` - Push schema to DB
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed needs, products, rules
- `npm run db:import-product-catalog` - Import `product-catalog/products.json` as vendor `medline-catalog`
- `npm run db:extract-medline-pdf-catalog` - Extract SKU/description/pkg data from Medline OTC PDF into CSV/JSON
- `npm run db:import-merged-pdf-catalog` - Import merged normalized PDF catalog JSON into products
- `npm run db:extract-pdf-images` - Extract embedded images from PDF catalogs and build SKU image candidate map (`-- --apply` to write image URLs to DB)
- `npm run db:studio` - Open Drizzle Studio

## What Is NOT Logged or Tracked

- Need category selections
- IP addresses in app logs
- Request bodies
- Third-party analytics or pixels

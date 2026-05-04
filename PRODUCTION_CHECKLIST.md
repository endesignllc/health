# Production Deployment Checklist — healthbenefits.shop

End-to-end steps to take this project from local to a private-preview production URL gated by Google sign-in, with Peter on the access list.

> **Order matters.** Each section depends on the one before it. Don't skip ahead.

---

## 1. Rotate the leaked Neon password

The previous `.env.example` contained a real Neon password. Rotate before any deploy.

1. Open [console.neon.tech](https://console.neon.tech) → project **HealthBenefits**.
2. Sidebar → **Branches** → click **production**.
3. Scroll to **Roles** → click the **⋯** next to `neondb_owner` → **Reset password**.
4. Copy the new password (Neon shows it only once).
5. Click **Connect** at the top.
6. Copy the **pooled** connection string. Save as `DATABASE_URL`.
7. Toggle **"Connection pooling"** **off** and copy the **unpooled** string. Save as `DATABASE_URL_UNPOOLED`.
8. Update your local `.env.local` with both values.
9. Verify: `npm run db:push` succeeds locally.

## 2. Create the Google OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a new project named **Health Benefits Shop** (or reuse an existing one you control).
2. **APIs & Services** → **OAuth consent screen** (initial wizard).
   - User type: **External**.
   - App name: `Health Benefits Shop`
   - User support email: your email
   - Developer contact: your email
   - Scopes: leave defaults (email, profile, openid)
   - **Test users:** In **Google Auth Platform → Audience** (or the consent screen flow), add every Google account that should sign in while publishing status is **Testing** — e.g. **mike@…** and **peter@…**. If someone is missing here, Google blocks them **before** your app runs; this is independent of `ALLOWED_EMAILS`.
   - Optional but often required for policy checks: **Google Auth Platform → Branding** — set real **https://** links for app home page, privacy policy, and terms; add your domain under **Authorized domains**.
3. **Credentials** → **Create credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: `Health Benefits Shop — Web`
   - **Authorized JavaScript origins:**
     - `http://localhost:3009`
     - `https://healthbenefits.shop`
     - `https://www.healthbenefits.shop` (only if you also serve the www subdomain)
     - `https://<your-vercel-preview>.vercel.app` (you'll get this after step 3 — add it then)
   - **Authorized redirect URIs:**
     - `http://localhost:3009/api/auth/callback/google`
     - `http://127.0.0.1:3009/api/auth/callback/google` (only if developers open the site via 127.0.0.1)
     - `https://healthbenefits.shop/api/auth/callback/google`
     - `https://<your-vercel-preview>.vercel.app/api/auth/callback/google` (add after step 3)
4. Copy the **Client ID** → save as `AUTH_GOOGLE_ID`.
5. Copy the **Client secret** → save as `AUTH_GOOGLE_SECRET`.
6. Generate `AUTH_SECRET`: `openssl rand -base64 32`. Save it.

## 3. Push to GitHub and connect to Vercel

Use **[github.com/endesignllc/health](https://github.com/endesignllc/health)** only — **do not** push or import the legacy Foundry repo for this site.

1. Confirm `.env.local` is in `.gitignore` (committed in this repo; never commit secrets).
2. `git remote -v` should show **`origin`** → `https://github.com/endesignllc/health.git` (or the SSH equivalent). Remove any **`foundry`** or old remote before pushing if you copied this folder from elsewhere.
3. Commit and push to the **`health`** repo (`main` or your default branch).
4. [vercel.com](https://vercel.com) → **Add New…** → **Project** → **Import** **`endesignllc/health`**. Treat this as a **new** project (do not reuse the old Foundry Vercel project unless you intentionally retarget it — prefer a clean project for clarity).
5. Framework: Next.js (auto-detected).
6. Don't deploy yet — set env vars first (next step).

## 4. Add Vercel environment variables

In **Project → Settings → Environment Variables**, add the following for **Production**, **Preview**, and **Development** scopes:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled Neon string from step 1 |
| `DATABASE_URL_UNPOOLED` | Unpooled Neon string from step 1 |
| `AUTH_SECRET` | The 32-byte random string from step 2 |
| `AUTH_GOOGLE_ID` | Google OAuth client ID from step 2 |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret from step 2 |
| `AUTH_URL` | `https://healthbenefits.shop` (must match public site origin Auth.js uses for callbacks) |
| `ALLOWED_EMAILS` | `mike@…,peter@…` (comma-separated, no spaces) |
| `STRIPE_SECRET_KEY` | `sk_test_...` for now (live key later) |
| `STRIPE_WEBHOOK_SECRET` | Set after step 6 |
| `ADMIN_TOKEN` | Long random string |
| `PRICE_INGEST_SECRET` | Long random string |
| `CRON_SECRET` | Long random string |
| `NEXT_PUBLIC_BASE_URL` | `https://healthbenefits.shop` |

## 5. First deploy and Vercel domain setup

1. Trigger the deploy.
2. Once deployed, copy the auto-generated `*.vercel.app` URL.
3. Go back to Google Cloud → OAuth client → add the Vercel preview URL to both **Authorized origins** and **Authorized redirect URIs** (`<vercel-url>/api/auth/callback/google`).
4. **Vercel → Project → Settings → Domains.**
5. Add `healthbenefits.shop` and `www.healthbenefits.shop`.
6. Vercel will show DNS records to add at your registrar (typically an `A` record pointing to `76.76.21.21` and a `CNAME` for `www`).
7. Add those records at your domain registrar. Wait for DNS to propagate (usually <10 min, can be up to a few hours).
8. Vercel auto-issues a Let's Encrypt certificate.

## 6. Configure the production Stripe webhook

1. [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. URL: `https://healthbenefits.shop/api/webhook/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` in Vercel env vars.
5. Redeploy from Vercel for the env var to take effect.

## 7. Run database migrations against production

From your local machine, with `DATABASE_URL_UNPOOLED` pointing at the production Neon branch:

```bash
DATABASE_URL=$DATABASE_URL_UNPOOLED npm run db:push
DATABASE_URL=$DATABASE_URL_UNPOOLED npm run db:seed
```

(The unpooled connection avoids advisory-lock issues during migrations.)

## 8. Smoke test

1. Open `https://healthbenefits.shop` in an incognito window.
2. Should redirect to `/sign-in`.
3. Sign in with **mike@…** → should land on `/`.
4. Sign out (browser cookie clear or via dev tools).
5. Sign in with a non-allowlisted email → should land on `/access-denied`.
6. Test as Peter: send him `https://healthbenefits.shop/sign-in` and confirm he can sign in.

## 9. Send to Peter

Email Peter:

> Hey Peter — early preview is up at **https://healthbenefits.shop**.
> Sign in with the Google account at **<peter's email>**. If anything looks off, reply with a screenshot.

---

## Troubleshooting

**Sign-in fails at Google while the app is in "Testing".** Confirm the Google account is listed under **Audience → Test users** and you clicked **Save**. Every teammate needs their own row; wait ~1 minute after changes.

**Google returns `invalid_request` / OAuth 2.0 policy in the Auth.js logs.** Complete **Branding** (home, privacy, terms as real `https://` URLs), **Authorized domains**, and keep the consent screen accurate. External apps in Testing still need test users on the Audience page.

**"redirect_uri_mismatch" from Google.** The exact callback URL — including protocol, host, and `/api/auth/callback/google` path — must be in the **Authorized redirect URIs** list. Add it and retry. Changes propagate in ~1 min.

**Redirects go to `http://0.0.0.0:3009` and the browser errors.** Run `npm run dev` (localhost) for day-to-day OAuth, or set `AUTH_URL` to a browser-reachable URL if you use `npm run dev:lan`. See README **Google sign-in**.

**Anyone with a Google account can sign in.** `ALLOWED_EMAILS` is unset or empty in Vercel. The app fails closed, so this shouldn't happen — but verify the variable exists in the Production environment scope.

**Sign-in works but `/admin` redirects to `/admin/login`.** That's correct — the admin token gate is layered on top of Google auth. Visit `/admin/login` and enter the `ADMIN_TOKEN`.

**Stripe webhook signing failures.** The `STRIPE_WEBHOOK_SECRET` for production is different from the `whsec_` value the Stripe CLI generates locally. Use the value from the Stripe dashboard webhook settings.

**P1002 advisory-lock timeout on migrations.** You're running migrations against the pooled connection. Use `DATABASE_URL_UNPOOLED` for `db:push` and `db:migrate`.

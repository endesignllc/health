# Deploy

The end-to-end production deployment guide lives in [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

It covers, in order:

1. Rotating the Neon password and grabbing connection strings
2. Creating the Google OAuth client
3. Pushing to GitHub and connecting Vercel
4. Adding environment variables in Vercel
5. First deploy + pointing `healthbenefits.shop` at Vercel
6. Configuring the production Stripe webhook
7. Running database migrations against production
8. Smoke-testing the site-gate
9. Sharing the URL

Use that document. Anything in older revisions of this file referenced a different repo name (`endesignllc/foundry`) and Prisma — both are stale. Delete this file once everyone's on the new checklist.

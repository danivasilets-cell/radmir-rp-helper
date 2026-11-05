# Radmir RP Helper — Vercel + Neon + Cloudflare R2

This branch removes the Netlify deployment and storage adapters.

## Stack
- Vercel + Nitro for TanStack Start server rendering and server routes.
- Neon PostgreSQL through Drizzle's Neon HTTP driver.
- Cloudflare R2 (S3-compatible API) for car, news, and topic images.

## Required environment variables
Copy `.env.example` into Vercel Project Settings → Environment Variables and fill in real values. Never commit `.env` or paste secrets into chat.

- `DATABASE_URL`: Neon connection string. Use the pooled connection string if Neon offers one; a direct connection string also works for initial setup.
- `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- `R2_CAR_IMAGES_BUCKET`, `R2_NEWS_IMAGES_BUCKET`, `R2_TOPIC_IMAGES_BUCKET`.
- `OWNER_PASSWORD`: strong owner password for the first owner login/reset flow.

## Create the database tables and starter content
Use Node.js 22+ on your computer. Install dependencies, then run:

```bash
npm install
DATABASE_URL='YOUR_NEON_CONNECTION_STRING' npm run db:setup
```

The setup script applies the project's original SQL migrations in timestamp order and records each applied migration. It creates the schema and inserts the included starter content. It does not import old Netlify accounts or old Netlify Blobs files.

## Create Cloudflare R2 buckets
Create three private buckets with the exact names used in the environment variables. Create an R2 API token with Object Read & Write for those buckets. The app serves images through its own authenticated/controlled API routes, so public bucket access is not required.

## Deploy to Vercel
1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add the environment variables above for Production (and Preview if desired).
4. Deploy. Vercel should detect TanStack Start + Nitro.
5. After deployment, test owner login, user registration, car photo upload, news image upload, and topic image upload.

Do not remove the original Netlify project until the new deployment and all tests pass.

# Deploy

## Status

**Not deployed yet.** Foundation is on GitHub at https://github.com/QuestionBankHub/space.
Production deploy + CI will be wired in Plan 2.

## Why deferred

Pushing the CI workflow file (`.github/workflows/ci.yml`) requires a `gh` OAuth token
with the `workflow` scope. The current token doesn't have it. To unblock:

```bash
gh auth refresh -h github.com -s workflow
```

(One browser click.) Then re-add the workflow file and push.

## Local verification (works today)

```bash
pnpm install
pnpm build
npx serve dist          # smoke-test the static output locally
```

## Planned hosting

Cloudflare Pages, free tier. Static `dist/` output deployed on every push to `main`.

### Setup path A — git-connected (when CI is back)

Cloudflare dashboard one-time setup:

1. https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Select `QuestionBankHub/space`
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
   - **Env vars:** `NODE_VERSION=22`, `PNPM_VERSION=10`
4. **Save and Deploy**

### Setup path B — Wrangler direct upload (zero dashboard)

```bash
pnpm dlx wrangler login                          # one-time browser click
pnpm build
pnpm dlx wrangler pages deploy dist --project-name=space
```

Subsequent deploys are just the last command.

## Custom domain

Deferred (see spec, post-MVP).

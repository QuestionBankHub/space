# Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an Astro 5 + Tailwind + MDX project with content collections, a dark cosmic base layout, one shipping page, and a working Cloudflare Pages deployment — so every subsequent plan adds features to a real, live site.

**Architecture:** Astro static site with islands architecture. MDX for all long-form content. Tailwind for styling. Content collections (Astro's typed Markdown layer) define schemas for lessons, missions, topics, and bodies up front so later plans only add files, not config. Cloudflare Pages serves the static output globally for free.

**Tech Stack:** Astro 5, Tailwind CSS 4, MDX, TypeScript (strict), pnpm, Cloudflare Pages, GitHub Actions for CI.

**Working directory:** `C:\Users\jose_\Empire\Space\` (already initialized as a git repo with the design doc and engine demos committed).

**Reference spec:** `docs/superpowers/specs/2026-05-01-space-learning-site-design.md`

---

## File Structure

What this plan creates / modifies in `Empire/Space/`:

```
.gitignore                            # Astro defaults + .DS_Store, .vscode/, .env
README.md                             # Project intro, dev commands, deploy notes
package.json                          # pnpm-managed
pnpm-lock.yaml
tsconfig.json                         # strict
astro.config.mjs                      # MDX, Tailwind, Cloudflare adapter (static)
tailwind.config.mjs                   # dark cosmic palette tokens
src/
  styles/
    global.css                        # Tailwind base + cosmic variables
  layouts/
    BaseLayout.astro                  # dark shell, header, footer, OG metadata
  components/
    SiteHeader.astro
    SiteFooter.astro
  content.config.ts                   # collections: lessons, missions, topics, bodies
  pages/
    index.astro                       # placeholder home (real 3D hub in Plan 2)
    about.astro                       # first real content page
public/
  favicon.svg                         # simple ringed-planet glyph
.github/
  workflows/
    ci.yml                            # astro check + build on push/PR
```

## Pre-flight

- [ ] **Verify pnpm is installed**

  Run: `pnpm --version`

  Expected: prints a version (≥ 9.0). If missing: `npm install -g pnpm`.

- [ ] **Verify Node ≥ 20.10**

  Run: `node --version`

  Expected: `v20.10.x` or higher. Astro 5 requires Node 20.10+ or 22+.

- [ ] **Verify you are at the repo root**

  Run: `pwd`

  Expected: `/c/Users/jose_/Empire/Space` (or Windows-style equivalent).

---

## Task 1: Initialize Astro project in place

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/`, `public/`
- Modify: none

The repo already has `docs/` and `experiments/` — we need Astro to scaffold *into* the existing directory without wiping them. Astro's CLI supports this via `--template minimal --typescript strict --install --no-git`.

- [ ] **Step 1: Run the Astro create wizard pointed at current directory**

  Run from `Empire/Space/`:

  ```bash
  pnpm create astro@latest . --template minimal --typescript strict --install --no-git --skip-houston --yes
  ```

  Expected: command finishes with "Liftoff confirmed". Creates `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`, `public/favicon.svg`. Existing `docs/` and `experiments/` left untouched.

  If the wizard refuses because the directory is non-empty, instead run:
  ```bash
  pnpm create astro@latest .astro-tmp --template minimal --typescript strict --install --no-git --skip-houston --yes
  cp -r .astro-tmp/. . && rm -rf .astro-tmp
  pnpm install
  ```

- [ ] **Step 2: Verify the dev server boots**

  Run: `pnpm dev`

  Expected: `Local: http://localhost:4321/` printed within 5 s. Open URL → see Astro's default minimal page. Stop with Ctrl+C.

- [ ] **Step 3: Replace `.gitignore` with project-appropriate version**

  Replace contents of `.gitignore` with:

  ```gitignore
  # build output
  dist/
  .astro/

  # dependencies
  node_modules/

  # logs
  npm-debug.log*
  pnpm-debug.log*
  yarn-debug.log*
  yarn-error.log*

  # environment
  .env
  .env.production
  .env.development

  # editor
  .vscode/
  .idea/
  *.swp

  # OS
  .DS_Store
  Thumbs.db
  ```

- [ ] **Step 4: Verify build succeeds**

  Run: `pnpm build`

  Expected: build completes; `dist/index.html` exists.

- [ ] **Step 5: Commit**

  ```bash
  git add .gitignore package.json pnpm-lock.yaml astro.config.mjs tsconfig.json src/ public/
  git commit -m "chore: scaffold Astro 5 project with strict TypeScript"
  ```

---

## Task 2: Add MDX integration

**Files:**
- Modify: `astro.config.mjs`, `package.json`

- [ ] **Step 1: Install the MDX integration**

  Run: `pnpm astro add mdx --yes`

  Expected: Astro adds `@astrojs/mdx` to dependencies and updates `astro.config.mjs` with `import mdx from '@astrojs/mdx'` + `integrations: [mdx()]`.

- [ ] **Step 2: Verify build still succeeds**

  Run: `pnpm build`

  Expected: build completes without errors.

- [ ] **Step 3: Commit**

  ```bash
  git add astro.config.mjs package.json pnpm-lock.yaml
  git commit -m "feat: add MDX integration"
  ```

---

## Task 3: Add Tailwind CSS 4

**Files:**
- Modify: `astro.config.mjs`, `package.json`
- Create: `src/styles/global.css`

Astro 5 uses Tailwind 4 via the official Vite plugin (`@tailwindcss/vite`), not a PostCSS config. Per [Astro Tailwind docs](https://docs.astro.build/en/guides/styling/#tailwind).

- [ ] **Step 1: Install Tailwind 4 and the Vite plugin**

  Run:

  ```bash
  pnpm add -D tailwindcss @tailwindcss/vite
  ```

- [ ] **Step 2: Wire the plugin into `astro.config.mjs`**

  Replace contents of `astro.config.mjs` with:

  ```js
  // @ts-check
  import { defineConfig } from 'astro/config';
  import mdx from '@astrojs/mdx';
  import tailwindcss from '@tailwindcss/vite';

  export default defineConfig({
    integrations: [mdx()],
    vite: {
      plugins: [tailwindcss()],
    },
  });
  ```

- [ ] **Step 3: Create `src/styles/global.css` with cosmic theme tokens**

  Create `src/styles/global.css`:

  ```css
  @import "tailwindcss";

  @theme {
    --color-cosmos-bg: #05060a;
    --color-cosmos-surface: #0a0c18;
    --color-cosmos-border: #1c2038;
    --color-cosmos-fg: #e8eaf2;
    --color-cosmos-muted: #9aa0b4;
    --color-cosmos-accent: #7aa6ff;
    --color-cosmos-warm: #ff9f6a;
    --font-serif: "Source Serif 4", Georgia, serif;
    --font-sans: "Inter", -apple-system, "Segoe UI", sans-serif;
  }

  html, body {
    background: var(--color-cosmos-bg);
    color: var(--color-cosmos-fg);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }

  .prose-cosmos {
    font-family: var(--font-serif);
    line-height: 1.7;
    max-width: 68ch;
  }
  ```

- [ ] **Step 4: Verify build produces a CSS bundle**

  Run: `pnpm build`

  Expected: build succeeds; `dist/_astro/*.css` exists and contains `--color-cosmos-bg`.

  Verify: `grep -r "cosmos-bg" dist/_astro/` returns at least one match.

- [ ] **Step 5: Commit**

  ```bash
  git add astro.config.mjs package.json pnpm-lock.yaml src/styles/global.css
  git commit -m "feat: add Tailwind 4 with cosmic theme tokens"
  ```

---

## Task 4: Build the base layout + header + footer

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`

- [ ] **Step 1: Create `src/components/SiteHeader.astro`**

  ```astro
  ---
  ---
  <header class="border-b border-cosmos-border">
    <nav class="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
      <a href="/" class="text-cosmos-fg font-semibold tracking-tight text-lg">
        Space<span class="text-cosmos-accent">·</span>
      </a>
      <ul class="flex gap-6 text-sm text-cosmos-muted">
        <li><a href="/" class="hover:text-cosmos-fg transition-colors">Hub</a></li>
        <li><a href="/engineering" class="hover:text-cosmos-fg transition-colors">Lab</a></li>
        <li><a href="/about" class="hover:text-cosmos-fg transition-colors">About</a></li>
      </ul>
    </nav>
  </header>
  ```

- [ ] **Step 2: Create `src/components/SiteFooter.astro`**

  ```astro
  ---
  ---
  <footer class="border-t border-cosmos-border mt-24">
    <div class="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between gap-4 text-xs text-cosmos-muted">
      <p>Free, public, and made for the curious.</p>
      <p>Data: NASA · ESA · Gaia DR3 · USGS · Solar System Scope.</p>
    </div>
  </footer>
  ```

- [ ] **Step 3: Create `src/layouts/BaseLayout.astro`**

  ```astro
  ---
  import "../styles/global.css";
  import SiteHeader from "../components/SiteHeader.astro";
  import SiteFooter from "../components/SiteFooter.astro";

  interface Props {
    title: string;
    description?: string;
    ogImage?: string;
  }

  const { title, description = "An interactive textbook for astronomy and spaceflight engineering.", ogImage = "/og-default.png" } = Astro.props;
  const canonical = new URL(Astro.url.pathname, Astro.site ?? Astro.url).toString();
  ---
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="generator" content={Astro.generator} />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="canonical" href={canonical} />
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <title>{title}</title>
    </head>
    <body class="min-h-screen flex flex-col">
      <SiteHeader />
      <main class="flex-1"><slot /></main>
      <SiteFooter />
    </body>
  </html>
  ```

- [ ] **Step 4: Verify build still succeeds**

  Run: `pnpm build`

  Expected: success, no TypeScript errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/layouts src/components
  git commit -m "feat: base layout with cosmic header and footer"
  ```

---

## Task 5: Wire the home page to the base layout

**Files:**
- Modify: `src/pages/index.astro`

This is a placeholder home — the real 3D solar-system hub arrives in Plan 2. For now it states the project's purpose with cosmic typography so we can validate the layout end-to-end.

- [ ] **Step 1: Replace `src/pages/index.astro` contents**

  ```astro
  ---
  import BaseLayout from "../layouts/BaseLayout.astro";
  ---
  <BaseLayout title="Space — an interactive textbook">
    <section class="max-w-3xl mx-auto px-6 pt-24 pb-16">
      <p class="text-sm uppercase tracking-[0.2em] text-cosmos-muted mb-4">Coming soon</p>
      <h1 class="text-5xl md:text-6xl font-semibold tracking-tight mb-6">
        Space, the way it<br/>actually feels.
      </h1>
      <p class="text-cosmos-muted text-lg max-w-xl leading-relaxed">
        An interactive textbook for astronomy and spaceflight engineering — built around real data,
        real missions, and a 3D solar system you can fly through.
      </p>
    </section>
  </BaseLayout>
  ```

- [ ] **Step 2: Boot the dev server and eyeball it**

  Run: `pnpm dev`

  Open http://localhost:4321/ — expected: dark background, cosmic header, large heading, footer at bottom. No JS errors in console. Stop with Ctrl+C.

- [ ] **Step 3: Verify build produces `dist/index.html`**

  Run: `pnpm build && ls dist/index.html`

  Expected: file exists; `grep "Space, the way" dist/index.html` finds the heading (proves SSR / static rendering worked).

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/index.astro
  git commit -m "feat: placeholder home page with cosmic styling"
  ```

---

## Task 6: Define content collections (lessons, missions, topics, bodies)

**Files:**
- Create: `src/content.config.ts`, `src/content/lessons/.gitkeep`, `src/content/missions/.gitkeep`, `src/content/topics/.gitkeep`, `src/content/bodies/.gitkeep`

Defining schemas now means later plans only add MDX files — no config churn. Per [Astro content collections](https://docs.astro.build/en/guides/content-collections/).

- [ ] **Step 1: Create `src/content.config.ts`**

  ```ts
  import { defineCollection, z } from "astro:content";
  import { glob } from "astro/loaders";

  const bodies = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/bodies" }),
    schema: z.object({
      slug: z.string(),
      name: z.string(),
      type: z.enum(["star", "planet", "moon", "asteroid", "comet", "spacecraft"]),
      summary: z.string(),
      hero_scene: z.string().optional(),
    }),
  });

  const lessons = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/lessons" }),
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      summary: z.string(),
      bodies: z.array(z.string()).default([]),
      topics: z.array(z.string()).default([]),
      hero_scene: z.string().optional(),
      reading_time: z.number().int().positive(),
      published: z.date(),
    }),
  });

  const missions = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/missions" }),
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      summary: z.string(),
      bodies: z.array(z.string()).default([]),
      topics: z.array(z.string()).default([]),
      hero_scene: z.string().optional(),
      date_event: z.date(),
      agency: z.string().optional(),
      reading_time: z.number().int().positive(),
      published: z.date(),
    }),
  });

  const topics = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/topics" }),
    schema: z.object({
      title: z.string(),
      slug: z.string(),
      summary: z.string(),
      hero_scene: z.string().optional(),
      reading_time: z.number().int().positive(),
      published: z.date(),
    }),
  });

  export const collections = { bodies, lessons, missions, topics };
  ```

- [ ] **Step 2: Create empty collection directories with `.gitkeep`**

  Create the four files (each empty):
  - `src/content/lessons/.gitkeep`
  - `src/content/missions/.gitkeep`
  - `src/content/topics/.gitkeep`
  - `src/content/bodies/.gitkeep`

- [ ] **Step 3: Verify Astro picks up the collections**

  Run: `pnpm astro check`

  Expected: 0 errors, 0 warnings. May print "0 collections found" entries — that's fine since the dirs are empty.

- [ ] **Step 4: Verify build still succeeds**

  Run: `pnpm build`

  Expected: success.

- [ ] **Step 5: Commit**

  ```bash
  git add src/content.config.ts src/content/
  git commit -m "feat: define content collections for bodies, lessons, missions, topics"
  ```

---

## Task 7: Build the About page (first real MDX content)

**Files:**
- Create: `src/pages/about.astro`

Validates the layout + Tailwind + MDX-style prose styling end-to-end on a real, indexable page.

- [ ] **Step 1: Create `src/pages/about.astro`**

  ```astro
  ---
  import BaseLayout from "../layouts/BaseLayout.astro";
  ---
  <BaseLayout
    title="About — Space"
    description="What this site is, who built it, and why."
  >
    <article class="max-w-3xl mx-auto px-6 pt-20 pb-24">
      <p class="text-sm uppercase tracking-[0.2em] text-cosmos-muted mb-4">About</p>
      <h1 class="text-4xl md:text-5xl font-semibold tracking-tight mb-8">
        A free, interactive textbook for space.
      </h1>
      <div class="prose-cosmos text-cosmos-fg space-y-5">
        <p>
          This site is built around a simple idea: space should feel like space.
          Not a slideshow of facts. Not a cartoon of orbits. The real thing —
          accurate scales, real planetary surfaces, real missions, real engineering.
        </p>
        <p>
          Every page is a static, fast-loading document. The 3D scenes load only
          when you ask for them. Nothing is locked behind an account.
        </p>
        <p>
          Built with Astro, Three.js, and data from NASA, ESA, the Gaia mission,
          USGS Astrogeology, and Solar System Scope. Source code is open.
        </p>
      </div>
    </article>
  </BaseLayout>
  ```

- [ ] **Step 2: Eyeball it**

  Run: `pnpm dev`

  Open http://localhost:4321/about — expected: serif body text, comfortable measure (~68ch), reads well on dark background. Stop the server.

- [ ] **Step 3: Verify the page is in the build output**

  Run: `pnpm build && ls dist/about/index.html`

  Expected: file exists; `grep "interactive textbook" dist/about/index.html` finds prose (proves static HTML for SEO).

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/about.astro
  git commit -m "feat: about page"
  ```

---

## Task 8: Add a CI workflow (astro check + build)

**Files:**
- Create: `.github/workflows/ci.yml`

Catches type errors and broken builds on every push *before* Cloudflare deploys them.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

  ```yaml
  name: ci

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4

        - uses: pnpm/action-setup@v4
          with:
            version: 9

        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: pnpm

        - name: Install dependencies
          run: pnpm install --frozen-lockfile

        - name: Type check
          run: pnpm astro check

        - name: Build
          run: pnpm build
  ```

- [ ] **Step 2: Verify YAML parses**

  Run: `pnpm dlx js-yaml .github/workflows/ci.yml >/dev/null && echo OK`

  Expected: prints `OK`.

- [ ] **Step 3: Commit**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: type-check and build on every push and PR"
  ```

---

## Task 9: Write the README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

  ```markdown
  # Space

  A free, interactive textbook for astronomy and spaceflight engineering.
  Built with Astro 5, Three.js, and real data from NASA, ESA, and Gaia.

  ## Status

  Phase 1: Foundation. See `docs/superpowers/specs/2026-05-01-space-learning-site-design.md`
  for the full design and `docs/superpowers/plans/` for the rolling implementation plans.

  ## Develop

  ```bash
  pnpm install
  pnpm dev          # http://localhost:4321
  pnpm build        # static output -> dist/
  pnpm astro check  # type check
  ```

  ## Engine comparison demos

  The four demos used to choose Three.js over Babylon, Cesium, and a hybrid stack:

  ```bash
  python -m http.server 8765 --directory experiments/engine-comparison
  ```

  Then open http://localhost:8765/.

  ## Deploy

  Static output in `dist/` deploys to Cloudflare Pages. See `docs/deploy.md`.

  ## License

  Source code: MIT. Content: CC-BY 4.0.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add README.md
  git commit -m "docs: project README"
  ```

---

## Task 10: Deploy to Cloudflare Pages

**Files:**
- Create: `docs/deploy.md`

Cloudflare Pages connection is a one-time dashboard click that the human (Jose) must do — Astro outputs static HTML to `dist/`, and Cloudflare builds it on every git push to `main`. No credit card required.

- [ ] **Step 1: Push the repo to a new private GitHub repo**

  Run from `Empire/Space/`:

  ```bash
  gh repo create josegonzalezbarron/space --private --source=. --remote=origin --push
  ```

  Expected: repo created, `main` pushed. If `gh` CLI is not authenticated, run `gh auth login` first.

  Adjust the org/user prefix as appropriate. If a `space` repo already exists, append a suffix.

- [ ] **Step 2: Create the Cloudflare Pages project (manual, one-time)**

  Open https://dash.cloudflare.com/?to=/:account/pages and:

  1. Click **Create application** → **Pages** → **Connect to Git**.
  2. Select the `space` repo.
  3. Build settings:
     - **Framework preset:** Astro
     - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
     - **Build output directory:** `dist`
     - **Root directory:** `/`
     - **Environment variables:** add `NODE_VERSION = 22` and `PNPM_VERSION = 9`.
  4. Click **Save and Deploy**.

  Expected: first deployment finishes in ~2 min and serves at `https://space-XXXX.pages.dev`. Open it — the home and `/about` pages should load with full styling.

- [ ] **Step 3: Document the deploy in `docs/deploy.md`**

  Create `docs/deploy.md`:

  ```markdown
  # Deploy

  ## Hosting

  Cloudflare Pages, free tier. Static `dist/` output deployed on every push to `main`.

  ## Cloudflare project settings

  - **Framework preset:** Astro
  - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
  - **Build output directory:** `dist`
  - **Root directory:** `/`
  - **Env vars:** `NODE_VERSION=22`, `PNPM_VERSION=9`

  ## URLs

  - Production: `https://space-XXXX.pages.dev` (replace XXXX with the actual subdomain)
  - Preview: each PR gets its own `https://<hash>.space-XXXX.pages.dev`

  ## Custom domain

  Deferred (see spec, post-MVP).

  ## Local verification before pushing

  ```bash
  pnpm astro check && pnpm build
  npx serve dist          # smoke-test the static output locally
  ```
  ```

- [ ] **Step 4: Commit and push**

  ```bash
  git add docs/deploy.md README.md
  git commit -m "docs: deploy notes for Cloudflare Pages"
  git push
  ```

  Expected: GitHub Actions CI passes; Cloudflare Pages deploys; production URL serves the latest content.

---

## Done criteria

- [ ] `pnpm dev` boots and serves `/` and `/about` with cosmic styling.
- [ ] `pnpm build` produces a `dist/` directory with `index.html` and `about/index.html`.
- [ ] `pnpm astro check` reports 0 errors.
- [ ] Content collections defined for `bodies`, `lessons`, `missions`, `topics` (empty, schema-validated).
- [ ] CI workflow runs `astro check` + build on every push/PR.
- [ ] Site is live on a `*.pages.dev` URL.
- [ ] Total cost: $0.

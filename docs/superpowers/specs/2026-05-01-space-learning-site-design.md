# Space Learning Site — Design

**Status:** Approved (brainstorming complete)
**Date:** 2026-05-01
**Owner:** Jose

## Summary

A public, free interactive site that teaches **astronomy + spaceflight engineering** through a cinematic, scientifically accurate "you are in space" experience. The homepage is a 3D solar system you navigate; each planet expands into a body page with lessons and mission deep-dives; an Engineering Lab houses foundational concepts (rocket equation, orbital mechanics) that missions reference in context.

Built as a content-first static site with Three.js scenes mounted as interactive islands only where they earn their weight. Free to operate at MVP scale.

## Goals

1. **Public, no login wall** — anyone can read and explore.
2. **Visually stunning + scientifically accurate** — real NASA/ESA data, cinematic shaders, no cartoon aesthetic.
3. **"You are in space" feel** — navigation itself reinforces immersion.
4. **Discoverable** — SEO-perfect static HTML for every route. People find it via Google.
5. **Fast first paint** — under 2 s LCP on a mid-range laptop. 3D loads progressively after first paint.
6. **Low maintenance** — solo operator running 17+ ventures cannot babysit servers.
7. **Free at MVP scale** — Cloudflare Pages free tier, no paid services until traffic justifies.
8. **Authoring speed** — content is Markdown/MDX; writing should feel like writing.

## Non-Goals (MVP)

- User accounts, quizzes with leaderboards, social features
- Real-time anything (multiplayer launches, live chat)
- Mobile-first 3D — desktop is primary; mobile gets simplified scenes
- Custom domain — ships to a `*.pages.dev` subdomain at first
- Audio / ambient sound
- All planets at launch — Earth is the pilot

## Audience

Anyone interested in space — students, hobbyists, curious adults. No prerequisites. Engineering content goes deeper for those who want it but stays accessible at the surface.

## Architecture

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 5** | Static-by-default, MDX-native, islands ship JS only where needed. Same stack as Red Milpa — familiar. |
| Styling | **Tailwind CSS** | Fast iteration, no CSS file management. |
| Content | **MDX** | Markdown for prose + JSX for embedded interactive components. |
| 3D Engine | **Three.js (r170+, WebGPU backend, TSL shaders)** | Highest ceiling, biggest ecosystem, full shader control. Validated via live demo comparison vs Babylon, Cesium, hybrid. |
| Hosting | **Cloudflare Pages** | Free tier: unlimited bandwidth, 500 builds/mo, edge cache. |
| Repo | **`Empire/Space/`** | Separate project, separate git repo (mirrors Red Milpa pattern). |
| Progress storage (MVP) | **localStorage** | No backend. Cross-device sync deferred to post-MVP. |
| Analytics | **Cloudflare Web Analytics** | Free, privacy-friendly, no cookie banner. |

### Data Sources (all free / permissive)

| Need | Source | License |
|---|---|---|
| Live planet positions (client-side, no API) | [astronomy-engine](https://github.com/cosinekitty/astronomy) (~50 KB JS, VSOP87/NOVAS) | MIT |
| Spacecraft trajectories (cached snapshots) | [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | NASA public |
| Earth-orbit satellites (ISS, etc.) | [satellite.js](https://github.com/shashwatak/satellite-js) + Celestrak TLEs | MIT |
| Planetary textures (8K) | [Solar System Scope](https://www.solarsystemscope.com/textures/) | CC-BY 4.0 |
| Scientific surface maps (Mars, Moon, icy moons) | [USGS Astrogeology](https://astrogeology.usgs.gov/search/maps) | Public domain |
| Earth imagery | [NASA Visible Earth](https://visibleearth.nasa.gov/), [GIBS](https://gibs.earthdata.nasa.gov/) | Public domain |
| Star catalog | [Gaia DR3](https://www.cosmos.esa.int/web/gaia/dr3) — magnitude-limited subset | CC-BY 4.0 (with credit) |
| Milky Way background | [ESO Milky Way panorama](https://www.eso.org/public/images/eso0932a/) | CC-BY 4.0 |
| Spacecraft 3D models | [NASA 3D Resources](https://nasa3d.arc.nasa.gov/) | Public domain |

### Routes

```
/                    3D solar-system hub (interactive, progressive load)
/cosmos              Galactic / cosmological hub                       [post-MVP]
/engineering         Engineering Lab hub (orbit playground, rocket eqn, propulsion)
/body/[planet]       Per-body landing — lessons + missions for that body
/lesson/[slug]       MDX article with Three.js scene islands
/mission/[slug]      Mission deep-dive
/topic/[slug]        Cross-cutting topic (rocket equation, atmospheres, etc.)
/about               About the project
```

Each lesson, mission, and topic is a normal static MDX route — full text in HTML for SEO and slow connections. The 3D hubs are *navigation chrome*, not where content lives.

### Content Model

Each piece of content is an MDX file with frontmatter:

```yaml
---
title: "Apollo 11"
slug: "apollo-11"
type: "mission"            # lesson | mission | topic
bodies: ["earth", "moon"]  # which body pages this surfaces on
topics: ["rocket-equation", "orbital-mechanics", "lunar-landing"]
date_event: "1969-07-20"
hero_scene: "apollo-11-trajectory"   # optional Three.js scene component name
reading_time: 12
---
```

Tags drive cross-surfacing: a mission tagged with `topics: ["rocket-equation"]` appears as a "see it in action" link on the Lab's rocket equation topic page.

### 3D Rendering Approach

- **One shared Three.js engine module** (`src/3d/engine.ts`) — handles canvas creation, WebGPU/WebGL fallback, scaled-coordinate system (planets to AU to light-years without floating-point breakdown), shared texture cache, post-processing pipeline.
- **Scene components** (`src/3d/scenes/*.ts`) — each is a self-contained scene (`SolarSystemHub`, `EarthOrbit`, `Apollo11Trajectory`, `RocketEquationPlayground`). Mounted by an Astro island wrapper.
- **Island wrapper** (`<Scene scene="solar-system-hub" />`) — Astro component that lazy-loads the engine + scene only on the client, with a static poster image as fallback for crawlers and pre-hydration.
- **Custom shaders** — atmospheric scattering, ring lighting, sun corona, magnitude-weighted star points (TSL so they compile to WebGL2 *or* WebGPU).
- **LOD discipline** — every scene specifies texture resolutions per device class (mobile = 2K, desktop = 8K).

### Performance + SEO Discipline

- Lighthouse target: LCP < 2.0 s, CLS < 0.1, performance score ≥ 90 on desktop.
- Static HTML rendered at build time for every route. JS hydrates only where islands exist.
- Hero scenes load progressively: solid background → poster → starfield → planets stream in.
- Textures lazy-loaded, with `<link rel="preload">` only for the hero scene's first frame.
- All 3D code is dynamically imported — never blocks initial bundle.
- Each route exposes Open Graph + Twitter card metadata with a pre-rendered scene screenshot.

## MVP Scope (Phase 1)

**Goal:** prove the entire architecture on one body before scaling.

- Home: 3D solar-system hub. All 8 planets clickable. Only Earth has content; others show "Coming soon" panel.
- Earth body page (`/body/earth`): hero scene, 3 lessons, 1 mission card.
- 3 lessons under Earth:
  - `/lesson/earth-from-space` — overview + Blue Marble interactive
  - `/lesson/why-earth-is-blue` — Rayleigh scattering + interactive demo
  - `/lesson/atmosphere-as-shield` — atmospheric layers + meteor entry sim
- 1 mission: `/mission/apollo-11` — long-form deep-dive with embedded trajectory scene; cross-links to rocket equation topic in the Lab.
- Engineering Lab (`/engineering`): hub page + 1 interactive topic page.
  - `/topic/rocket-equation` — Tsiolkovsky equation playground (sliders for Isp, mass ratio; live delta-v output; reference missions).
- About page.
- 404 page (with starfield, why not).

**Success criteria for MVP:**
- All 6 content routes render with full HTML for SEO.
- Lighthouse desktop ≥ 90 performance, ≥ 95 SEO, ≥ 95 accessibility.
- 3D hub loads to interactive in < 4 s on mid-range laptop, broadband.
- Site deploys to Cloudflare Pages on every push to `main`.
- Total cost: $0.

## Phase 2 (post-MVP, prioritized)

1. **Mobile 3D refinement** — simplified scenes, touch controls, capability detection.
2. **Mars** as second body, including a Mars rover mission deep-dive.
3. **More Lab topics** — Hohmann transfer playground, orbital elements visualizer, Hohmann/bi-elliptic comparison.
4. **Cosmos hub** — zoom out from the Sun to the Milky Way; deep-sky lessons.
5. **Custom domain** + Cloudflare Web Analytics.
6. **Optional accounts** (Supabase) — only if cross-device progress sync becomes a real ask.

## Aesthetic Direction

- **Palette:** deep cosmic dark (`#05060a` background), high-contrast white text, accent blue (`#7aa6ff`), warm orange for engineering accents (`#ff9f6a`).
- **Typography:** serif for body prose (readability for long-form), sans for UI chrome.
- **References:** SpaceX site (quiet, confident), NASA's Eyes (depth), Stellarium Web (accuracy), Apple product pages (negative space, scroll choreography).
- **Forbidden:** neon, cartoon planets, lens flare overuse, generic galaxy gradients, AI-stock-image aesthetics.
- **Validate:** during build via screenshot review. Not a brainstorming gate.

## Repository Layout

```
Empire/Space/
├── README.md
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
├── src/
│   ├── pages/
│   │   ├── index.astro                  # 3D solar-system hub
│   │   ├── about.astro
│   │   ├── 404.astro
│   │   ├── body/[planet].astro
│   │   ├── lesson/[slug].astro
│   │   ├── mission/[slug].astro
│   │   ├── topic/[slug].astro
│   │   └── engineering/index.astro
│   ├── content/
│   │   ├── lessons/*.mdx
│   │   ├── missions/*.mdx
│   │   └── topics/*.mdx
│   ├── components/
│   │   ├── Scene.astro                  # 3D island wrapper
│   │   ├── BodyCard.astro
│   │   ├── LessonCard.astro
│   │   └── ...
│   ├── 3d/
│   │   ├── engine.ts                    # shared engine + scaled coords
│   │   ├── shaders/                     # TSL/GLSL
│   │   ├── data/                        # texture manifests, star catalog subsets
│   │   └── scenes/
│   │       ├── solar-system-hub.ts
│   │       ├── earth-orbit.ts
│   │       ├── apollo-11.ts
│   │       └── rocket-equation.ts
│   ├── layouts/
│   └── styles/
├── public/
│   ├── textures/                        # versioned, optimized
│   ├── catalogs/                        # gaia subset, etc.
│   └── posters/                         # static fallbacks for each scene
├── experiments/
│   └── engine-comparison/               # the 4 demos used to choose Three.js
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-01-space-learning-site-design.md
```

## Decision Log

| Decision | Picked | Why |
|---|---|---|
| Audience | Public | User intent. |
| Core experience | Interactive textbook + mission deep-dives | User picked A + C. |
| Scope | Astronomy + spaceflight engineering | User stated. |
| 3D engine | Three.js + WebGPU + TSL shaders | Validated against Babylon, Cesium, hybrid via live demos. Highest ceiling, biggest ecosystem. |
| Web framework | Astro 5 | Content-first site, SEO + first paint critical, MDX-native, islands match the "3D only where needed" pattern. Familiar from Red Milpa. |
| IA | 3D hub + per-body lessons + Engineering Lab + missions | "You are in space" vibe demands hub-first navigation; Lab gives engineering a home; missions surface engineering in context. |
| Engineering placement | Lab hub + contextual surfacing on missions | Foundational concepts need a home; theory becomes vivid in mission context. |
| MVP slice | One planet (Earth) end-to-end + 1 Lab topic | Forces full architecture on one body before scaling. After MVP, everything is content not architecture. |
| Hosting | Cloudflare Pages free tier | Zero cost at MVP scale. |
| Accounts | None at MVP; localStorage progress | Public learning site doesn't need them day one. Adding later is a thin layer, not a rewrite. |

## Open Questions (validate during build, not blocking)

- Which 3 Earth lessons exactly? Listed above are placeholders — could swap with "Earth's magnetic field" or "How seasons work."
- Is Apollo 11 the right pilot mission, or something less obvious (Voyager 1)? Apollo is more recognizable; Voyager more cinematic. Pick during build.
- Texture preloading vs streaming — measure on real hardware before committing.
- WebGPU fallback path: WebGL2 with TSL transpilation, or maintain two shader paths? Default to TSL transpilation; revisit if a shader breaks.

## References

**Reference sites for "you are in space" feel:**
- [NASA's Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/) — depth, accuracy
- [Stellarium Web](https://stellarium-web.org/) — sky accuracy
- [Solar System Scope](https://www.solarsystemscope.com/) — composition
- [SpaceX](https://www.spacex.com/) — visual restraint

**Engine + library docs:**
- [Three.js](https://threejs.org/) · [WebGPU backend notes](https://threejs.org/manual/#en/webgpu)
- [Astro](https://astro.build/) · [Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [astronomy-engine](https://github.com/cosinekitty/astronomy)
- [satellite.js](https://github.com/shashwatak/satellite-js)

**Engine comparison demos (in this repo):**
- `experiments/engine-comparison/` — Three.js, Babylon.js, Cesium, hybrid, all rendering the same Earth + starfield scene

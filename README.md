# Space

A free, interactive textbook for astronomy and spaceflight engineering.
Built with Astro, Three.js, and real data from NASA, ESA, and Gaia.

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

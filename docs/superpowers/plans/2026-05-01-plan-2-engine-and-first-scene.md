# Plan 2: 3D Engine + Solar System Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder home page with a live, interactive 3D solar-system hub — Sun, eight planets at their *current heliocentric positions* (via `astronomy-engine`), a magnitude-weighted starfield, sun bloom, and click handlers that log the selected body to the console (real routing arrives in Plan 3).

**Architecture:** A single shared `engine.ts` module owns the renderer, post-processing, and lifecycle (resize, dispose). Scene factories (`scenes/solar-system-hub.ts`) build their own `THREE.Scene` and return an `init/dispose` API. An Astro island (`Scene.astro`) lazy-loads the scene module client-side only — pre-hydration users and crawlers get a static SVG poster, so the page is fully indexable and feels instant on first paint.

**Tech Stack:** Three.js 0.169 (WebGL2 renderer; WebGPU/TSL upgrade is a Phase 2 optimization), `astronomy-engine` for VSOP87 planet positions, custom GLSL shaders for the starfield + sun, OrbitControls + EffectComposer + UnrealBloomPass from Three.js examples.

**Working directory:** `C:\Users\jose_\Empire\Space\` (already on `main`, GitHub at https://github.com/QuestionBankHub/space).

**Reference spec:** `docs/superpowers/specs/2026-05-01-space-learning-site-design.md`
**Builds on:** Plan 1 (foundation — already shipped).

---

## File Structure

What this plan creates / modifies in `Empire/Space/`:

```
package.json                                 # +three, @types/three, astronomy-engine
src/
  3d/
    engine.ts                                # NEW. Renderer, post-processing, lifecycle.
    data/
      planets.ts                             # NEW. Static planet metadata (color, visual radius, label).
      starfield.ts                           # NEW. Procedural star generator (positions + colors + sizes).
    scenes/
      solar-system-hub.ts                    # NEW. Builds Sun + 8 planets + stars; exposes init/dispose.
  components/
    Scene.astro                              # NEW. Island wrapper: poster + dynamic-imported scene.
  pages/
    index.astro                              # MODIFY. Mount the Scene island; remove placeholder text.
public/
  posters/
    solar-system-hub.svg                     # NEW. Static fallback shown before hydration.
```

**Why this split:**
- `engine.ts` knows nothing about scenes — anything reusable across scenes lives here (renderer, composer, resize, dispose).
- `scenes/*.ts` are factories: each returns `{ start(), stop(), dispose() }`. Multiple scenes can coexist in the codebase without leaking globals.
- `data/*.ts` is pure data — easy to test, easy to swap textures later, no Three.js types in the import.
- `Scene.astro` is the only place Astro touches Three.js. Everywhere else is plain TypeScript modules.

---

## Pre-flight

- [ ] **Verify Plan 1 is shipped and clean**

  Run from `Empire/Space/`:

  ```bash
  git status && git log --oneline | head -5 && pnpm build 2>&1 | tail -3
  ```

  Expected: working tree clean, last commit is the deploy doc, `pnpm build` succeeds with 2 pages.

---

## Task 1: Install Three.js + astronomy-engine

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install dependencies**

  Run:

  ```bash
  pnpm add three@^0.169.0 astronomy-engine@^2.1.19
  pnpm add -D @types/three@^0.169.0
  ```

  Expected: three, @types/three, and astronomy-engine appear in `package.json`. `pnpm-lock.yaml` updates.

- [ ] **Step 2: Verify build still works**

  Run: `pnpm build`

  Expected: 2 pages built, no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add package.json pnpm-lock.yaml
  git commit -m "feat: add three.js and astronomy-engine"
  ```

---

## Task 2: Planet metadata module

**Files:**
- Create: `src/3d/data/planets.ts`

This module owns the static facts we need to render and label the planets — *visual* radius (chosen for legibility, not physical accuracy), albedo color, real radius in km (for tooltips later), and the astronomy-engine `Body` enum value used to query live positions.

- [ ] **Step 1: Create `src/3d/data/planets.ts`**

  ```ts
  import { Body } from "astronomy-engine";

  export interface PlanetDef {
    /** URL-safe identifier (matches `body` slug used elsewhere) */
    slug: "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";
    /** Display name */
    name: string;
    /** astronomy-engine Body enum (used to compute heliocentric position) */
    body: Body;
    /** Visual radius in scene units. Chosen for legibility, not physical accuracy. */
    visualRadius: number;
    /** True equatorial radius in km — for future tooltips. */
    radiusKm: number;
    /** Approximate body color (sRGB hex). Used as the procedural material albedo until real textures land. */
    color: number;
    /** Whether the planet has visible rings (Saturn). Controls a ring mesh in the hub scene. */
    hasRings: boolean;
  }

  export const PLANETS: readonly PlanetDef[] = [
    { slug: "mercury", name: "Mercury", body: Body.Mercury, visualRadius: 0.06, radiusKm: 2440,  color: 0x9c8a7a, hasRings: false },
    { slug: "venus",   name: "Venus",   body: Body.Venus,   visualRadius: 0.10, radiusKm: 6052,  color: 0xe8c897, hasRings: false },
    { slug: "earth",   name: "Earth",   body: Body.Earth,   visualRadius: 0.10, radiusKm: 6371,  color: 0x4ea0ff, hasRings: false },
    { slug: "mars",    name: "Mars",    body: Body.Mars,    visualRadius: 0.08, radiusKm: 3389,  color: 0xc1440e, hasRings: false },
    { slug: "jupiter", name: "Jupiter", body: Body.Jupiter, visualRadius: 0.30, radiusKm: 69911, color: 0xd6b283, hasRings: false },
    { slug: "saturn",  name: "Saturn",  body: Body.Saturn,  visualRadius: 0.26, radiusKm: 58232, color: 0xe6c98c, hasRings: true  },
    { slug: "uranus",  name: "Uranus",  body: Body.Uranus,  visualRadius: 0.18, radiusKm: 25362, color: 0x9bd6e0, hasRings: false },
    { slug: "neptune", name: "Neptune", body: Body.Neptune, visualRadius: 0.18, radiusKm: 24622, color: 0x4f6ed8, hasRings: false },
  ];
  ```

- [ ] **Step 2: Verify TypeScript accepts it**

  Run: `pnpm astro check`

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/3d/data/planets.ts
  git commit -m "feat: planet metadata module"
  ```

---

## Task 3: Starfield generator module

**Files:**
- Create: `src/3d/data/starfield.ts`

A pure function that returns three typed arrays (positions, colors, sizes) for a magnitude-weighted star distribution. No Three.js imports — the scene wraps the result in a `BufferGeometry`. Same algorithm validated in the engine demos (Plan 0).

- [ ] **Step 1: Create `src/3d/data/starfield.ts`**

  ```ts
  /**
   * Generates a procedural starfield distributed uniformly on a sphere.
   *
   * - Positions: uniform on a sphere of radius `radius`.
   * - Colors: ~70% white-yellow (main sequence), ~20% blue-white (hot), ~10% red-orange (giants).
   * - Sizes: power-law magnitude distribution — most stars dim, few bright (`Math.pow(rand, 7) * 3 + 0.5`).
   *
   * Returns interleaved Float32Arrays for direct use as a THREE.BufferGeometry.
   */
  export function generateStarfield(count: number, radius: number, seed = 1) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    let s = seed;
    const rand = () => {
      // Mulberry32 — deterministic PRNG so tests + screenshots are reproducible.
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const u = rand();
      const v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const t = rand();
      let r: number, g: number, b: number;
      if (t < 0.7)      { r = 1.00; g = 0.96; b = 0.92; } // white-yellow
      else if (t < 0.9) { r = 0.75; g = 0.85; b = 1.00; } // blue
      else              { r = 1.00; g = 0.78; b = 0.55; } // red giant
      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      sizes[i] = Math.pow(rand(), 7) * 3.0 + 0.5;
    }

    return { positions, colors, sizes };
  }
  ```

- [ ] **Step 2: Verify TypeScript accepts it**

  Run: `pnpm astro check`

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/3d/data/starfield.ts
  git commit -m "feat: deterministic procedural starfield generator"
  ```

---

## Task 4: Shared engine module

**Files:**
- Create: `src/3d/engine.ts`

Owns the renderer + post-processing pipeline + lifecycle. A scene gets handed an `EngineHandle` and only worries about what's inside the scene.

- [ ] **Step 1: Create `src/3d/engine.ts`**

  ```ts
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
  import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
  import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

  export interface EngineHandle {
    readonly renderer: THREE.WebGLRenderer;
    readonly camera: THREE.PerspectiveCamera;
    readonly controls: OrbitControls;
    readonly composer: EffectComposer;
    readonly clock: THREE.Clock;
    /** Call once per frame from the scene's animate loop. */
    render(scene: THREE.Scene): void;
    /** Free GPU resources, remove DOM listeners. Idempotent. */
    dispose(): void;
  }

  export interface EngineOptions {
    canvas: HTMLCanvasElement;
    /** Initial camera distance from origin (scene units). */
    cameraDistance?: number;
    /** Bloom strength (0 = off). Default 0.45. */
    bloomStrength?: number;
    /** Min/max OrbitControls distance. */
    minDistance?: number;
    maxDistance?: number;
  }

  /**
   * Creates a renderer + camera + controls + bloom-enabled composer.
   * Resize is handled internally via ResizeObserver on the canvas's parent.
   */
  export function createEngine(opts: EngineOptions): EngineHandle {
    const { canvas } = opts;
    const parent = canvas.parentElement ?? document.body;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(parent.clientWidth, parent.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const camera = new THREE.PerspectiveCamera(45, parent.clientWidth / parent.clientHeight, 0.01, 5000);
    const cameraDistance = opts.cameraDistance ?? 8;
    camera.position.set(cameraDistance, cameraDistance * 0.35, cameraDistance);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = opts.minDistance ?? 2;
    controls.maxDistance = opts.maxDistance ?? 60;

    const composer = new EffectComposer(renderer);
    const dummyScene = new THREE.Scene();
    composer.addPass(new RenderPass(dummyScene, camera));
    const bloomStrength = opts.bloomStrength ?? 0.45;
    if (bloomStrength > 0) {
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(parent.clientWidth, parent.clientHeight),
        bloomStrength,
        0.6,
        0.0,
      ));
    }

    const clock = new THREE.Clock();

    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    let disposed = false;

    return {
      renderer,
      camera,
      controls,
      composer,
      clock,
      render(scene) {
        if (disposed) return;
        // Replace the RenderPass scene each frame so the engine can drive any scene.
        const renderPass = composer.passes[0] as RenderPass;
        renderPass.scene = scene;
        controls.update();
        composer.render();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        ro.disconnect();
        controls.dispose();
        composer.dispose();
        renderer.dispose();
      },
    };
  }
  ```

- [ ] **Step 2: Verify TypeScript accepts it**

  Run: `pnpm astro check`

  Expected: 0 errors. (If `three/examples/jsm/...` import paths fail under strict TS, see Task 4.5 below.)

- [ ] **Step 3: Commit**

  ```bash
  git add src/3d/engine.ts
  git commit -m "feat: shared three.js engine with bloom pipeline and lifecycle"
  ```

---

## Task 5: Solar System Hub scene

**Files:**
- Create: `src/3d/scenes/solar-system-hub.ts`

Builds the Sun (emissive sphere with bloom-friendly material), the 8 planets at their *current heliocentric positions* via `astronomy-engine`, a starfield from the Task 3 generator, and a raycaster that fires `onPlanetClick(slug)` when a planet is clicked.

The scene **scales heliocentric AU coordinates logarithmically** so all 8 planets fit a viewport without Mercury vanishing into the Sun: `r_visual = log10(au + 1) * SCALE`. Real positional ratios are preserved within each octave.

- [ ] **Step 1: Create `src/3d/scenes/solar-system-hub.ts`**

  ```ts
  import * as THREE from "three";
  import { HelioVector } from "astronomy-engine";
  import { PLANETS, type PlanetDef } from "../data/planets";
  import { generateStarfield } from "../data/starfield";
  import { createEngine, type EngineHandle } from "../engine";

  export interface SolarSystemHubOptions {
    canvas: HTMLCanvasElement;
    /** Called when a planet sphere is clicked. */
    onPlanetClick?: (slug: PlanetDef["slug"]) => void;
    /** Date used to compute heliocentric positions. Defaults to now. */
    date?: Date;
  }

  export interface SolarSystemHubHandle {
    start(): void;
    stop(): void;
    dispose(): void;
  }

  const ORBIT_SCALE = 6.0; // multiplier on log-compressed AU distance

  function logScaleAu(au: number): number {
    // log10(au + 1) gives:
    //  0.39 AU (Mercury) → 0.143 → 0.86 scene units
    //  1.00 AU (Earth)   → 0.301 → 1.81 scene units
    //  5.20 AU (Jupiter) → 0.792 → 4.75 scene units
    //  30.1 AU (Neptune) → 1.493 → 8.96 scene units
    return Math.log10(au + 1) * ORBIT_SCALE;
  }

  function createSun(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(0.5, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd56b });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.kind = "sun";
    return mesh;
  }

  function createPlanetMesh(def: PlanetDef): THREE.Group {
    const group = new THREE.Group();
    group.userData = { kind: "planet", slug: def.slug, name: def.name };

    const geo = new THREE.SphereGeometry(def.visualRadius, 48, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.85,
      metalness: 0.0,
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.userData = group.userData;
    group.add(sphere);

    if (def.hasRings) {
      const ringGeo = new THREE.RingGeometry(def.visualRadius * 1.4, def.visualRadius * 2.2, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd6b283,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.2;
      group.add(ring);
    }

    return group;
  }

  function createStarfieldPoints(): THREE.Points {
    const { positions, colors, sizes } = generateStarfield(8000, 400, 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, a);
        }`,
    });

    return new THREE.Points(geo, mat);
  }

  export function createSolarSystemHub(opts: SolarSystemHubOptions): SolarSystemHubHandle {
    const date = opts.date ?? new Date();

    const engine: EngineHandle = createEngine({
      canvas: opts.canvas,
      cameraDistance: 12,
      bloomStrength: 0.6,
      minDistance: 2,
      maxDistance: 80,
    });

    const scene = new THREE.Scene();

    // Lighting: Sun emits, ambient just enough so dark sides aren't pure black.
    const sunLight = new THREE.PointLight(0xffe6b0, 4.0, 0, 1.5);
    scene.add(sunLight); // at origin
    scene.add(new THREE.AmbientLight(0x223044, 0.18));

    // Bodies
    const sun = createSun();
    scene.add(sun);

    const planetMeshes: THREE.Group[] = [];
    for (const def of PLANETS) {
      const group = createPlanetMesh(def);
      const helio = HelioVector(def.body, date); // returns AU x/y/z (ecliptic of J2000)
      const r = logScaleAu(Math.hypot(helio.x, helio.y, helio.z));
      const dirX = helio.x / Math.hypot(helio.x, helio.y, helio.z);
      const dirY = helio.y / Math.hypot(helio.x, helio.y, helio.z);
      const dirZ = helio.z / Math.hypot(helio.x, helio.y, helio.z);
      group.position.set(dirX * r, dirZ * r * 0.15, dirY * r); // flatten slightly so it reads as a system from default cam angle
      scene.add(group);
      planetMeshes.push(group);
    }

    // Stars
    scene.add(createStarfieldPoints());

    // Click raycaster — picks the nearest hit whose userData.kind === "planet".
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = opts.canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, engine.camera);
      const hits = raycaster.intersectObjects(planetMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0].object;
        const slug = hit.userData.slug ?? hit.parent?.userData.slug;
        if (slug && opts.onPlanetClick) opts.onPlanetClick(slug);
      }
    };

    let raf = 0;
    let running = false;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      sun.rotation.y += 0.001;
      for (const p of planetMeshes) p.rotation.y += 0.003;
      engine.render(scene);
    };

    return {
      start() {
        if (running) return;
        running = true;
        opts.canvas.addEventListener("click", onClick);
        animate();
      },
      stop() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(raf);
        opts.canvas.removeEventListener("click", onClick);
      },
      dispose() {
        this.stop();
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry?.dispose();
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (mat) mat.dispose();
        });
        engine.dispose();
      },
    };
  }
  ```

- [ ] **Step 2: Verify TypeScript accepts it**

  Run: `pnpm astro check`

  Expected: 0 errors. If `astronomy-engine` types complain about the `Body` enum or `HelioVector`, see Task 5.5 below.

- [ ] **Step 3: Commit**

  ```bash
  git add src/3d/scenes/solar-system-hub.ts
  git commit -m "feat: solar system hub scene with live heliocentric positions"
  ```

---

## Task 6: Static SVG poster (pre-hydration fallback)

**Files:**
- Create: `public/posters/solar-system-hub.svg`

Shown to crawlers and during the brief window before the 3D module loads. Hand-rolled SVG so it weighs ~2 KB and doesn't require image processing.

- [ ] **Step 1: Create `public/posters/solar-system-hub.svg`**

  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="bg" cx="50%" cy="55%" r="80%">
        <stop offset="0%" stop-color="#0a0e22"/>
        <stop offset="60%" stop-color="#05060a"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <radialGradient id="sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff2c4"/>
        <stop offset="40%" stop-color="#ffd56b"/>
        <stop offset="100%" stop-color="#ffd56b" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#4ea0ff" stop-opacity="0"/>
        <stop offset="100%" stop-color="#4ea0ff" stop-opacity="0.5"/>
      </radialGradient>
    </defs>

    <rect width="1600" height="900" fill="url(#bg)"/>

    <!-- procedural-looking stars -->
    <g fill="#ffffff">
      <circle cx="120"  cy="160" r="0.8"/>
      <circle cx="280"  cy="80"  r="1.2"/>
      <circle cx="430"  cy="240" r="0.6"/>
      <circle cx="610"  cy="120" r="1.0"/>
      <circle cx="780"  cy="60"  r="0.7"/>
      <circle cx="980"  cy="200" r="1.4"/>
      <circle cx="1180" cy="140" r="0.9"/>
      <circle cx="1380" cy="300" r="0.8"/>
      <circle cx="1500" cy="80"  r="1.1"/>
      <circle cx="80"   cy="780" r="0.7"/>
      <circle cx="320"  cy="700" r="1.3"/>
      <circle cx="540"  cy="820" r="0.6"/>
      <circle cx="760"  cy="760" r="0.9"/>
      <circle cx="1020" cy="820" r="1.0"/>
      <circle cx="1260" cy="700" r="0.8"/>
      <circle cx="1480" cy="780" r="1.2"/>
    </g>

    <!-- sun -->
    <circle cx="800" cy="495" r="120" fill="url(#sun)"/>
    <circle cx="800" cy="495" r="42"  fill="#fff2c4"/>

    <!-- a planet with atmosphere, hinting at the real scene -->
    <g transform="translate(1180,495)">
      <circle r="46" fill="url(#atmo)"/>
      <circle r="28" fill="#4ea0ff"/>
    </g>
  </svg>
  ```

- [ ] **Step 2: Verify the file is well-formed**

  Run: `pnpm dlx -y svgo --pretty public/posters/solar-system-hub.svg --output public/posters/solar-system-hub.svg 2>&1 | tail -3`

  Expected: SVGO reports a size and saves the optimized file. (If pnpm prompts to install svgo, accept.)

- [ ] **Step 3: Commit**

  ```bash
  git add public/posters/solar-system-hub.svg
  git commit -m "feat: static SVG poster for solar-system-hub fallback"
  ```

---

## Task 7: Astro island wrapper

**Files:**
- Create: `src/components/Scene.astro`

A thin component that renders the poster + a `<canvas>`, then dynamically imports the scene module on the client. Crawlers see the poster + `<noscript>` text. JS users get the poster swapped for the canvas as soon as the module loads.

- [ ] **Step 1: Create `src/components/Scene.astro`**

  ```astro
  ---
  /**
   * Mounts a 3D scene as a client island.
   * Server output is the poster + a hidden canvas; client script swaps them.
   */
  interface Props {
    /** Scene id — picks the dynamic-imported module. Currently only "solar-system-hub". */
    scene: "solar-system-hub";
    /** Path to the static poster shown before/without JS. */
    poster: string;
    /** Accessible alt text for the poster image. */
    alt: string;
    /** Min height in CSS units (e.g. "75vh"). */
    minHeight?: string;
  }

  const { scene, poster, alt, minHeight = "85vh" } = Astro.props;
  const canvasId = `scene-${scene}-${Math.random().toString(36).slice(2, 8)}`;
  ---

  <div class="scene-host relative w-full overflow-hidden bg-cosmos-bg" style={`min-height:${minHeight}`} data-scene={scene} data-canvas-id={canvasId}>
    <img
      src={poster}
      alt={alt}
      class="scene-poster absolute inset-0 w-full h-full object-cover"
      loading="eager"
      decoding="async"
    />
    <canvas id={canvasId} class="scene-canvas absolute inset-0 w-full h-full opacity-0 transition-opacity duration-700"></canvas>
    <noscript>
      <p class="absolute bottom-6 left-6 right-6 text-center text-cosmos-muted text-sm">
        This page is interactive. Enable JavaScript to fly through the solar system.
      </p>
    </noscript>
  </div>

  <script>
    // Dispatched per-island via a client:only-equivalent inline script.
    const hosts = document.querySelectorAll<HTMLElement>(".scene-host[data-scene]");
    hosts.forEach(async (host) => {
      const sceneId = host.dataset.scene;
      const canvasId = host.dataset.canvasId;
      if (!sceneId || !canvasId) return;
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
      if (!canvas) return;

      try {
        if (sceneId === "solar-system-hub") {
          const mod = await import("../3d/scenes/solar-system-hub.ts");
          const handle = mod.createSolarSystemHub({
            canvas,
            onPlanetClick: (slug) => {
              // Routing is wired in Plan 3 — for now log so we can verify clicks.
              console.log("[scene] planet click:", slug);
            },
          });
          handle.start();
          requestAnimationFrame(() => {
            canvas.style.opacity = "1";
            const poster = host.querySelector(".scene-poster") as HTMLElement | null;
            if (poster) poster.style.opacity = "0";
          });
        }
      } catch (err) {
        console.error("[scene] failed to mount", sceneId, err);
      }
    });
  </script>

  <style>
    .scene-host { contain: layout paint; }
    .scene-poster { transition: opacity 0.7s ease; }
  </style>
  ```

- [ ] **Step 2: Verify build**

  Run: `pnpm build`

  Expected: 2 pages built. The new `Scene.astro` is unused yet — Task 8 wires it.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Scene.astro
  git commit -m "feat: scene island wrapper with poster fallback and lazy scene import"
  ```

---

## Task 8: Wire the home page to the hub scene

**Files:**
- Modify: `src/pages/index.astro`

Replace the placeholder copy with the Scene island. Keep a small text block underneath so the page still has *some* indexable content above the fold for SEO.

- [ ] **Step 1: Replace `src/pages/index.astro`**

  ```astro
  ---
  import BaseLayout from "../layouts/BaseLayout.astro";
  import Scene from "../components/Scene.astro";
  ---
  <BaseLayout
    title="Space — an interactive textbook"
    description="A free, interactive textbook for astronomy and spaceflight engineering. Explore planets, missions, and engineering — in a 3D solar system."
  >
    <Scene
      scene="solar-system-hub"
      poster="/posters/solar-system-hub.svg"
      alt="Solar system from above with the Sun centered, planets at their current heliocentric positions, and a starfield background."
      minHeight="calc(100vh - 4rem)"
    />

    <section class="max-w-3xl mx-auto px-6 py-20">
      <p class="text-sm uppercase tracking-[0.2em] text-cosmos-muted mb-4">The hub</p>
      <h2 class="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
        Click any planet.
      </h2>
      <p class="text-cosmos-muted text-lg max-w-xl leading-relaxed">
        The positions above are real — pulled from the same VSOP87 ephemerides NASA uses,
        recomputed live in your browser. Soon, each planet opens into lessons and missions.
      </p>
    </section>
  </BaseLayout>
  ```

- [ ] **Step 2: Build and verify the home page is in the output**

  Run:

  ```bash
  pnpm build && grep -c "scene-host" dist/index.html && grep -o "Click any planet" dist/index.html
  ```

  Expected: `1` (one scene host present in HTML) and `Click any planet` (the section heading rendered statically, proving SEO content is preserved).

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/index.astro
  git commit -m "feat: mount solar system hub on home page"
  ```

---

## Task 9: Manual smoke test + push

**Files:**
- None modified.

- [ ] **Step 1: Boot the dev server**

  Run: `pnpm dev`

  Open http://localhost:4321/.

  **Verify visually:**
  - Page loads instantly with the SVG poster (dark scene, sun glow, hint of a planet).
  - Within ~1-2 s, the canvas fades in and replaces the poster.
  - You see the Sun at center with a soft warm glow.
  - 8 planets are positioned around the Sun; Saturn shows faint rings.
  - Background is a starfield with subtle color variation.
  - Drag-rotate works (OrbitControls). Scroll-zoom works between roughly 2 and 80 units.
  - Clicking a planet logs `[scene] planet click: <slug>` to the browser console.
  - No console errors. Resizing the window scales the canvas correctly.

  Stop the dev server (Ctrl+C).

- [ ] **Step 2: Run final type check + build**

  Run: `pnpm astro check && pnpm build`

  Expected: 0 errors; 2 pages built.

- [ ] **Step 3: Push**

  ```bash
  git push
  ```

  Expected: clean push to `origin/main`.

---

## Done criteria

- [ ] Home page renders the Solar System Hub with all 8 planets at their current heliocentric positions.
- [ ] Static SVG poster shows instantly; canvas fades in once the scene module loads.
- [ ] Crawlers see the poster + the H2/paragraph below — full SEO content in HTML.
- [ ] Click on any planet logs the slug to the console (routing in Plan 3).
- [ ] Drag/zoom controls feel smooth; bloom on the Sun feels right.
- [ ] `pnpm astro check` reports 0 errors.
- [ ] `pnpm build` succeeds; bundle-analyzer-equivalent (`ls -lh dist/_astro/*.js`) shows the home page only ships the scene chunk on user interaction (lazy-loaded — should be a separate chunk, not in the page entry).
- [ ] Site is pushed to GitHub.

---

## Troubleshooting addenda (only consult if a step fails)

### Task 4.5 — `three/examples/jsm` import path errors

If TypeScript can't resolve `three/examples/jsm/...`, add a triple-slash directive at the top of `engine.ts`:

```ts
/// <reference types="three" />
```

Or, if that doesn't help, ensure `tsconfig.json` has `"moduleResolution": "bundler"` (Astro's default; verify with `cat tsconfig.json`). If still failing, switch the import to the addons path:

```ts
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
```

`three/addons/*` is the alias for `three/examples/jsm/*` and is preferred from r152+.

### Task 5.5 — `astronomy-engine` Body enum

`astronomy-engine` exports `Body` as a string enum. If TS complains about `Body.Mercury` being incompatible, the fix is usually a versioning artifact — confirm `pnpm list astronomy-engine` shows ≥ 2.1.19. If still failing, replace `Body.Mercury` etc. with the string literals `"Mercury"`, `"Venus"`, ... directly — the runtime accepts both.

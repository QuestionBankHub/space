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
    const dist = Math.hypot(helio.x, helio.y, helio.z);
    const r = logScaleAu(dist);
    const dirX = helio.x / dist;
    const dirY = helio.y / dist;
    const dirZ = helio.z / dist;
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

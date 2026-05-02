import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

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

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

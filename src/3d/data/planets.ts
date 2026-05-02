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

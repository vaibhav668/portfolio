import * as THREE from 'three';

// Island rim radius as a function of angle. Shared by terrain, bounds and scattering.
export function rimRadius(theta) {
  return 67 + 2.4 * Math.sin(3 * theta + 0.4) + 1.6 * Math.sin(7 * theta + 1.3) + 0.9 * Math.sin(13 * theta);
}

// The walking path, as XZ control points. Starts at the bridge, ends at the comm tower.
const PATH_POINTS = [
  [0, 58], [-5, 50], [-14, 43], [-22, 38], [-31, 30], [-38, 19], [-40, 7], [-39, -5],
  [-36, -17], [-30, -27], [-21, -35], [-10, -40], [0, -41.5], [10, -40], [20, -36],
  [29, -28], [36, -19], [40, -8], [41, 5], [38, 17], [33, 28], [28, 36], [29, 43],
];

export const pathCurve = new THREE.CatmullRomCurve3(
  PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal'
);
export const PATH_WIDTH = 2.6; // half-width of the walkable stone path

// Dense polyline for distance queries.
export const pathSamples = pathCurve.getSpacedPoints(420).map((p) => new THREE.Vector2(p.x, p.z));

export function distToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < pathSamples.length - 1; i++) {
    const a = pathSamples[i], b = pathSamples[i + 1];
    const abx = b.x - a.x, abz = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz)));
    const dx = a.x + abx * t - x, dz = a.y + abz * t - z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// Arc-length parameter (0..1) of the path point nearest to (x, z).
export function pathParamAt(x, z) {
  let best = Infinity, bi = 0;
  for (let i = 0; i < pathSamples.length; i++) {
    const d = (pathSamples[i].x - x) ** 2 + (pathSamples[i].y - z) ** 2;
    if (d < best) { best = d; bi = i; }
  }
  return bi / (pathSamples.length - 1);
}

// Journey stations, in visiting order. `spot` is where the guide waits on the path,
// `site` is the landmark centre, `pad` is the flattened plaza radius around the site.
export const STATIONS = [
  { id: 'intro', name: 'Island entrance', short: 'Entrance', section: 'about', spot: [2.6, 53.5], site: [0, 57], pad: 7 },
  { id: 'education', name: 'The Academy', short: 'Academy', section: 'education', spot: [-20, 37], site: [-29, 46], pad: 9 },
  { id: 'skills', name: 'Skills', short: 'Skills', section: 'skills', spot: [-38, 9], site: [-50, 10], pad: 9 },
  { id: 'experience', name: 'Experience', short: 'Experience', section: 'experience', spot: [-28, -26], site: [-38, -37], pad: 9 },
  { id: 'projects', name: 'Project Hall', short: 'Projects', section: 'projects', spot: [3, -40], site: [0, -51], pad: 12 },
  { id: 'achievements', name: 'Achievements', short: 'Achievements', section: 'achievements', spot: [27, -27], site: [38, -36], pad: 8 },
  { id: 'visor', name: 'VISOR Control Center', short: 'Control center', section: 'visor', spot: [38, 7], site: [51, 6], pad: 9 },
  { id: 'contact', name: 'Comm Tower', short: 'Contact', section: 'contact', spot: [27, 39], site: [36, 47], pad: 8 },
];
STATIONS.forEach((s, i) => { s.index = i; s.t = pathParamAt(s.spot[0], s.spot[1]); });

// Other flattened areas: central tower hill, city corner, pond.
export const EXTRA_PADS = [
  { site: [0, 0], pad: 9, y: 1.2 },
  { site: [50, -21], pad: 9, y: 0 },
];
export const CITY = { x: 50, z: -21 };
export const POND = { x: -12, z: 12, r: 7 };
export const FALLS_POND = { x: 16, z: 55, r: 4 };

// Bridge and spawn platform (south of the island).
export const BRIDGE = { x: 0, z0: 62, z1: 81, halfWidth: 1.9, y: 0.25 };
export const SPAWN_PLATFORM = { x: 0, z: 86.5, r: 6.5, y: 0.25 };
export const SPAWN = { x: 0, z: 88, yaw: 0 }; // yaw 0 looks toward -Z (onto the island)

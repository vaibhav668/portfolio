import * as THREE from 'three';
import { rimRadius, distToPath, pathSamples, PATH_WIDTH, STATIONS, EXTRA_PADS, POND, FALLS_POND } from './layout.js';
import { fbm, smoothstep, rng } from './helpers.js';

const EXT = 76;          // grid half extent (m)
const RES = 0.6;         // grid cell size (m)
const N = Math.ceil((EXT * 2) / RES) + 1;
export const WATER_Y = 0.12;

const heightGrid = new Float32Array(N * N);
const pathGrid = new Float32Array(N * N);
const wildGrid = new Float32Array(N * N); // 0 on path/plazas, 1 in the wild (for scattering)

const PADS = [
  ...STATIONS.map((s) => ({ x: s.site[0], z: s.site[1], r: s.pad, y: null })),
  ...EXTRA_PADS.map((p) => ({ x: p.site[0], z: p.site[1], r: p.pad, y: p.y })),
];

function baseFlat(x, z) {
  return 0.35 + 0.3 * Math.sin(x * 0.031) * Math.cos(z * 0.027);
}

function computeHeight(x, z, dPath) {
  const flat = baseFlat(x, z);
  let hills = Math.max(-0.2, (fbm(x * 0.04 + 7.3, z * 0.04 - 2.1, 4) - 0.38) * 7.5);
  hills += 1.3 * Math.exp(-(x * x + z * z) / (2 * 16 * 16)); // gentle rise toward the tower
  let w = smoothstep(PATH_WIDTH + 0.6, PATH_WIDTH + 9, dPath);
  let target = flat;
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    const pw = smoothstep(p.r, p.r + 6, d);
    if (p.y !== null && d < p.r + 6) target = THREE.MathUtils.lerp(p.y, target, pw);
    w *= pw;
  }
  let h = THREE.MathUtils.lerp(target, flat + hills, w);
  // rim lip (only in the wild, so the path meets the bridge cleanly)
  const e = Math.hypot(x, z) / rimRadius(Math.atan2(z, x));
  h -= smoothstep(0.9, 1.0, e) * 0.7 * w;
  for (const pond of [POND, FALLS_POND]) {
    const d = Math.hypot(x - pond.x, z - pond.z);
    if (d < pond.r + 2.5) {
      const bowl = WATER_Y - 0.9 * (1 - (d / pond.r) ** 2);
      const k = smoothstep(pond.r + 2.5, pond.r - 0.5, d);
      h = THREE.MathUtils.lerp(h, d < pond.r ? bowl : Math.max(bowl, WATER_Y + 0.08), k);
    }
  }
  return { h, w };
}

export function buildHeightField() {
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -EXT + i * RES, z = -EXT + j * RES;
      const d = distToPath(x, z);
      const { h, w } = computeHeight(x, z, d);
      const k = j * N + i;
      heightGrid[k] = h; pathGrid[k] = d; wildGrid[k] = w;
    }
  }
}

function sample(grid, x, z) {
  const fx = (x + EXT) / RES, fz = (z + EXT) / RES;
  const i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fz)));
  const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j));
  const a = grid[j * N + i], b = grid[j * N + i + 1], c = grid[(j + 1) * N + i], d = grid[(j + 1) * N + i + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}
export const heightAt = (x, z) => sample(heightGrid, x, z);
export const pathDistAt = (x, z) => sample(pathGrid, x, z);
export const wildAt = (x, z) => sample(wildGrid, x, z);
export function insideIsland(x, z, margin = 0) {
  return Math.hypot(x, z) < rimRadius(Math.atan2(z, x)) - margin;
}

// ---------- painted colour map ----------
function paintColorMap() {
  const S = 2048, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const px = (v) => ((v + EXT) / (EXT * 2)) * S;
  const scale = S / (EXT * 2);
  const r = rng(42);

  g.fillStyle = '#6b5a38'; g.fillRect(0, 0, S, S);
  const greens = ['#5f8a3a', '#7a6340', '#4f7a34', '#6e5636', '#668f3e', '#58452c'];
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, rad = 20 + r() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, greens[i % greens.length] + 'cc'); gr.addColorStop(1, greens[i % greens.length] + '00');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // plazas
  for (const p of PADS) {
    const rad = (p.r - 1.2) * scale;
    g.fillStyle = '#7d6a4d'; g.beginPath(); g.arc(px(p.x), px(p.z), rad, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(60,45,30,0.35)'; g.lineWidth = 2;
    for (let k = 1; k < 6; k++) { g.beginPath(); g.arc(px(p.x), px(p.z), (rad * k) / 6, 0, Math.PI * 2); g.stroke(); }
    for (let a = 0; a < 24; a++) {
      const an = (a / 24) * Math.PI * 2;
      g.beginPath(); g.moveTo(px(p.x) + Math.cos(an) * rad / 6, px(p.z) + Math.sin(an) * rad / 6);
      g.lineTo(px(p.x) + Math.cos(an) * rad, px(p.z) + Math.sin(an) * rad); g.stroke();
    }
    g.strokeStyle = '#2f5fd8'; g.lineWidth = 5; g.beginPath(); g.arc(px(p.x), px(p.z), rad, 0, Math.PI * 2); g.stroke();
  }
  // path: dark border, stone fill, cobbles
  const stroke = (w, col) => {
    g.strokeStyle = col; g.lineWidth = w * scale; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pathSamples.forEach((p, i) => (i ? g.lineTo(px(p.x), px(p.y)) : g.moveTo(px(p.x), px(p.y)))); g.stroke();
  };
  stroke(PATH_WIDTH * 2 + 1.1, '#3f2f1f');
  stroke(PATH_WIDTH * 2, '#7a5f3f');
  const stones = ['#85694a', '#6e553a', '#7b6144', '#5f4a32', '#8a7050'];
  for (let i = 0; i < pathSamples.length - 1; i++) {
    const p = pathSamples[i];
    for (let k = 0; k < 7; k++) {
      const ox = (r() - 0.5) * PATH_WIDTH * 1.8, oz = (r() - 0.5) * PATH_WIDTH * 1.8;
      g.fillStyle = stones[(i + k) % stones.length];
      g.beginPath(); g.ellipse(px(p.x + ox), px(p.y + oz), 4 + r() * 6, 3 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill();
    }
  }
  // centre stripe: a subtle guiding line in the hero blue
  g.setLineDash([18, 22]); stroke(0.18, 'rgba(47,95,216,0.55)'); g.setLineDash([]);
  // pond shores
  for (const pond of [POND, FALLS_POND]) {
    const gr = g.createRadialGradient(px(pond.x), px(pond.z), pond.r * scale * 0.6, px(pond.x), px(pond.z), (pond.r + 1.8) * scale);
    gr.addColorStop(0, '#8c7650'); gr.addColorStop(1, 'rgba(140,118,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px(pond.x), px(pond.z), (pond.r + 1.8) * scale, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildIsland() {
  const group = new THREE.Group();
  const RINGS = 110, SEGS = 280;

  // ----- top surface -----
  const pos = [], uv = [], col = [], idx = [];
  const cTmp = new THREE.Color();
  for (let i = 0; i <= RINGS; i++) {
    const f = i / RINGS;
    for (let s = 0; s <= SEGS; s++) {
      const th = (s / SEGS) * Math.PI * 2;
      const R = rimRadius(th) * f;
      const x = Math.cos(th) * R, z = Math.sin(th) * R;
      const y = heightAt(x, z);
      pos.push(x, y, z);
      uv.push((x + EXT) / (EXT * 2), 1 - (z + EXT) / (EXT * 2));
      // height tint: hilltops warmer and lighter
      const k = THREE.MathUtils.clamp((y - 0.4) / 4, 0, 1);
      cTmp.setRGB(1, 1, 1).lerp(new THREE.Color(0.95, 0.9, 0.8), k);
      col.push(cTmp.r, cTmp.g, cTmp.b);
    }
  }
  for (let i = 0; i < RINGS; i++) for (let s = 0; s < SEGS; s++) {
    const a = i * (SEGS + 1) + s, b = a + SEGS + 1;
    // counter-clockwise when seen from above, so the faces (and normals) point up
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  top.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  top.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  top.setIndex(idx);
  top.computeVertexNormals();
  const topMesh = new THREE.Mesh(top, new THREE.MeshStandardMaterial({ map: paintColorMap(), vertexColors: true, roughness: 1, metalness: 0 }));
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // ----- underside: grass lip, soil bands, rock, tapering to a crystal tip -----
  const LAY = 30, upos = [], ucol = [], uidx = [];
  const soil = new THREE.Color('#8a5a3a'), soil2 = new THREE.Color('#6e452d'), rockA = new THREE.Color('#8b8496'), rockB = new THREE.Color('#4c4862');
  const lip = new THREE.Color('#5c9a3f');
  for (let l = 0; l <= LAY; l++) {
    const t = l / LAY;
    for (let s = 0; s <= SEGS; s++) {
      const th = (s / SEGS) * Math.PI * 2;
      const Rr = rimRadius(th);
      const n = fbm(Math.cos(th) * 3 + 5, Math.sin(th) * 3 + t * 5, 3);
      let rad = Rr * Math.pow(1 - t, 0.72) * (t < 0.04 ? 1 : 0.92 + 0.22 * n);
      if (l === LAY) rad = 0;
      const ex = Math.cos(th) * Rr, ez = Math.sin(th) * Rr;
      const yTop = heightAt(ex * 0.995, ez * 0.995);
      const y = l === 0 ? yTop : THREE.MathUtils.lerp(yTop - 0.4, -44, Math.pow(t, 0.9)) - n * 2.2 * t;
      upos.push(Math.cos(th) * rad, y, Math.sin(th) * rad);
      let c;
      if (t < 0.05) c = lip;
      else if (t < 0.24) c = (Math.floor(t * 40) % 2 ? soil : soil2);
      else c = rockA.clone().lerp(rockB, smoothstep(0.24, 1, t));
      ucol.push(c.r, c.g, c.b);
    }
  }
  for (let l = 0; l < LAY; l++) for (let s = 0; s < SEGS; s++) {
    const a = l * (SEGS + 1) + s, b = a + SEGS + 1;
    uidx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const under = new THREE.BufferGeometry();
  under.setAttribute('position', new THREE.Float32BufferAttribute(upos, 3));
  under.setAttribute('color', new THREE.Float32BufferAttribute(ucol, 3));
  under.setIndex(uidx);
  under.computeVertexNormals();
  const underMesh = new THREE.Mesh(under, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  underMesh.receiveShadow = true;
  group.add(underMesh);

  // ----- glowing core crystals at the tip -----
  const core = new THREE.Group();
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x7ff3ff, emissive: 0x2ed6ff, emissiveIntensity: 2.2, roughness: 0.2, flatShading: true });
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(1.2 + r() * 2.2, 0), crystalMat);
    c.scale.y = 2.2;
    c.position.set((r() - 0.5) * 6, -40 - r() * 6, (r() - 0.5) * 6);
    c.rotation.set((r() - 0.5) * 0.8, r() * 3, (r() - 0.5) * 0.8);
    core.add(c);
  }
  const coreLight = new THREE.PointLight(0x4fe3ff, 600, 60, 2);
  coreLight.position.set(0, -36, 0);
  core.add(coreLight);
  group.add(core);

  // ----- floating rocks orbiting the island -----
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  rockGeo.scale(1, 0.75, 1);
  const capGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.25, 7);
  capGeo.translate(0, 0.62, 0);
  const COUNT = 26;
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x8a8297, flatShading: true, roughness: 1 }), COUNT);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ color: 0x6aaa48, flatShading: true }), COUNT);
  rocks.castShadow = true;
  const data = [];
  for (let i = 0; i < COUNT; i++) {
    const th = r() * Math.PI * 2, rad = 72 + r() * 26;
    data.push({ th, rad, y: -6 - r() * 26, s: 0.8 + r() * 3.4, ph: r() * 6, sp: 0.02 + r() * 0.03 });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  group.add(rocks, caps);

  function update(t) {
    for (let i = 0; i < COUNT; i++) {
      const d = data[i];
      const th = d.th + t * d.sp * 0.1;
      v.set(Math.cos(th) * d.rad, d.y + Math.sin(t * 0.6 + d.ph) * 0.8, Math.sin(th) * d.rad);
      q.setFromEuler(e.set(0, d.ph + t * 0.05, 0));
      sc.setScalar(d.s);
      m4.compose(v, q, sc);
      rocks.setMatrixAt(i, m4); caps.setMatrixAt(i, m4);
    }
    rocks.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true;
    core.rotation.y = t * 0.1;
  }
  update(0);
  return { group, update };
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt, wildAt, pathDistAt, insideIsland, WATER_Y } from './Terrain.js';
import { rimRadius, pathCurve, PATH_WIDTH, POND, FALLS_POND } from './layout.js';
import { rng, fbm, PALETTE } from './helpers.js';

export const SUN_DIR = new THREE.Vector3(0.55, 0.62, 0.42).normalize();
const windTime = { value: 0 };

function addWind(material, strength, mode) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windTime;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         vec3 ip = instanceMatrix[3].xyz;
       #else
         vec3 ip = vec3(0.0);
       #endif
       float k = ${mode === 'tip' ? 'pow(uv.y, 2.0)' : 'max(position.y - 1.2, 0.0) * 0.25'};
       float g = sin(uWind * 1.7 + ip.x * 0.35 + ip.z * 0.2) + 0.5 * sin(uWind * 3.1 + ip.z * 0.7);
       transformed.x += g * k * ${strength.toFixed(3)};
       transformed.z += cos(uWind * 1.3 + ip.x * 0.4) * k * ${(strength * 0.6).toFixed(3)};`
    );
  };
  return material;
}

export function buildEnvironment(scene, quality) {
  const update = [];
  const colliders = [];
  const r = rng(99);

  // ---------- sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(480, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: SUN_DIR } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 uSun; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 zenith = vec3(0.20, 0.47, 0.86);
          vec3 horizon = vec3(1.0, 0.86, 0.70);
          vec3 below = vec3(0.62, 0.74, 0.92);
          vec3 col = h > 0.0 ? mix(horizon, zenith, pow(h, 0.55)) : mix(horizon, below, pow(-h, 0.45));
          float s = max(dot(normalize(vDir), uSun), 0.0);
          col += vec3(1.0, 0.82, 0.55) * pow(s, 8.0) * 0.45 + vec3(1.0, 0.95, 0.85) * pow(s, 900.0) * 3.0;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);
  scene.fog = new THREE.Fog(0xe4e3e6, 110, 380);

  // ---------- light ----------
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a8a4c, 1.5));
  const sun = new THREE.DirectionalLight(0xffeed6, 3.3);
  sun.position.copy(SUN_DIR).multiplyScalar(120);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 260 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  // ---------- clouds ----------
  const puffParts = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const s = 0.7 + r() * 0.7;
    g.scale(s, s * 0.8, s);
    g.translate((i - 3) * 0.75 + (r() - 0.5) * 0.4, (r() - 0.2) * 0.5, (r() - 0.5) * 0.9);
    puffParts.push(g);
  }
  const puff = mergeGeometries(puffParts);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xfff3e6, emissiveIntensity: 0.35 });
  const makeCloudLayer = (count, place) => {
    const m = new THREE.InstancedMesh(puff, cloudMat, count);
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) { place(o, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    const holder = new THREE.Group(); holder.add(m); scene.add(holder);
    return holder;
  };
  const upper = makeCloudLayer(16, (o) => {
    const th = r() * Math.PI * 2, rad = 95 + r() * 110;
    o.position.set(Math.cos(th) * rad, 8 + r() * 40, Math.sin(th) * rad);
    o.scale.setScalar(4 + r() * 7); o.scale.y *= 0.7; o.rotation.y = r() * 6;
  });
  const lower = makeCloudLayer(quality.isMobile ? 26 : 46, (o) => {
    const th = r() * Math.PI * 2, rad = 70 + r() * 180;
    o.position.set(Math.cos(th) * rad, -78 - r() * 26, Math.sin(th) * rad);
    o.scale.set(9 + r() * 10, 3 + r() * 3, 9 + r() * 10); o.rotation.y = r() * 6;
  });
  update.push((t) => { upper.rotation.y = t * 0.004; lower.rotation.y = -t * 0.0025; });

  // ---------- water ----------
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: { uTime: windTime, ...THREE.UniformsLib.fog },
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        vec3 deep = vec3(0.10, 0.45, 0.70), shallow = vec3(0.42, 0.82, 0.88);
        vec3 col = mix(deep, shallow, smoothstep(0.3, 1.0, d));
        float w = sin(vW.x * 2.1 + uTime * 1.4) * sin(vW.z * 1.7 - uTime * 1.1);
        col += smoothstep(0.75, 1.0, w) * 0.35;
        col += smoothstep(0.86, 1.0, d) * 0.25;
        gl_FragColor = vec4(col, 0.88);
        #include <fog_fragment>
      }`,
  });
  for (const pond of [POND, FALLS_POND]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(pond.r + 0.4, 40), waterMat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(pond.x, WATER_Y, pond.z);
    scene.add(w);
    colliders.push({ type: 'circle', x: pond.x, z: pond.z, r: pond.r - 0.3, soft: true });
  }
  // waterfall spilling off the rim
  const fallTh = Math.atan2(FALLS_POND.z, FALLS_POND.x);
  const fallR = rimRadius(fallTh) - 0.4;
  const fallMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: windTime },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
    fragmentShader: `uniform float uTime; varying vec2 vUv;
      void main(){
        float s = fract(vUv.y * 6.0 + uTime * 1.6 + sin(vUv.x * 20.0) * 0.08);
        float streak = smoothstep(0.0, 0.5, s) * 0.5 + 0.5 * step(0.7, fract(vUv.x * 13.0 + vUv.y * 2.0));
        vec3 col = mix(vec3(0.55, 0.85, 0.98), vec3(1.0), streak);
        float a = (1.0 - smoothstep(0.75, 1.0, 1.0 - vUv.y)) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(col, a * 0.8);
      }`,
  });
  const fallGeo = new THREE.PlaneGeometry(2.6, 34, 1, 20);
  fallGeo.translate(0, -17, 0);
  const pa = fallGeo.attributes.position;
  for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, Math.pow(-y / 34, 1.6) * 6); }
  const fall = new THREE.Mesh(fallGeo, fallMat);
  fall.position.set(Math.cos(fallTh) * fallR, WATER_Y, Math.sin(fallTh) * fallR);
  fall.rotation.y = -fallTh + Math.PI / 2;
  scene.add(fall);

  // ---------- grass ----------
  const blade = new THREE.PlaneGeometry(0.09, 0.55, 1, 3);
  blade.translate(0, 0.275, 0);
  const bp = blade.attributes.position, bcol = [];
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i) / 0.55;
    bp.setX(i, bp.getX(i) * (1 - y * 0.9));
    const c = new THREE.Color(0x3f7a2c).lerp(new THREE.Color(0xb7e07a), y);
    bcol.push(c.r, c.g, c.b);
  }
  blade.setAttribute('color', new THREE.Float32BufferAttribute(bcol, 3));
  const grassMat = addWind(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.18, 'tip');
  const grass = new THREE.InstancedMesh(blade, grassMat, quality.grass);
  const o = new THREE.Object3D(), tint = new THREE.Color();
  let placed = 0, tries = 0;
  while (placed < quality.grass && tries < quality.grass * 8) {
    tries++;
    const th = r() * Math.PI * 2, rad = Math.sqrt(r()) * 66;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    if (!insideIsland(x, z, 1.5) || wildAt(x, z) < 0.35 || pathDistAt(x, z) < PATH_WIDTH + 0.9) continue;
    if (fbm(x * 0.15, z * 0.15, 2) < 0.42) continue; // clumps
    o.position.set(x, heightAt(x, z) - 0.02, z);
    o.rotation.set((r() - 0.5) * 0.3, r() * Math.PI, (r() - 0.5) * 0.3);
    o.scale.setScalar(0.7 + r() * 0.9);
    o.updateMatrix();
    grass.setMatrixAt(placed, o.matrix);
    grass.setColorAt(placed, tint.setHSL(0.24 + r() * 0.06, 0.55, 0.45 + r() * 0.2));
    placed++;
  }
  grass.count = placed;
  grass.frustumCulled = false;
  scene.add(grass);

  // ---------- trees ----------
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6); trunkGeo.translate(0, 1.1, 0);
  const roundParts = [[0, 2.9, 0, 1.5], [0.8, 2.5, 0.3, 1.0], [-0.7, 2.6, -0.3, 1.1], [0.1, 3.7, 0, 0.95]].map(([x, y, z, s]) => {
    const g = new THREE.IcosahedronGeometry(s, 0); g.translate(x, y, z); return g;
  });
  const roundGeo = mergeGeometries(roundParts);
  const pineGeo = mergeGeometries([[1.6, 2.0, 2.0], [1.25, 1.7, 3.0], [0.85, 1.4, 3.9]].map(([rad, h, y]) => {
    const g = new THREE.ConeGeometry(rad, h, 7); g.translate(0, y, 0); return g;
  }));
  const canopyMat = (s) => addWind(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), s, 'top');
  const spots = [];
  for (let i = 0; i < 1600 && spots.length < quality.trees; i++) {
    const th = r() * Math.PI * 2, rad = Math.sqrt(r()) * 63;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    if (!insideIsland(x, z, 4) || wildAt(x, z) < 0.9 || pathDistAt(x, z) < 6.5) continue;
    if (spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 16)) continue;
    spots.push({ x, z, pine: r() < 0.4, s: 0.8 + r() * 0.6 });
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x7a5236, flatShading: true }), spots.length);
  const rounds = new THREE.InstancedMesh(roundGeo, canopyMat(0.05), spots.length);
  const pines = new THREE.InstancedMesh(pineGeo, canopyMat(0.04), spots.length);
  let ri = 0, pi = 0;
  const leafColors = [0x5fae45, 0x4f9a3c, 0x77bf4f, 0x8cc35a, 0xe0a13a, 0xd8743a];
  spots.forEach((s, i) => {
    o.position.set(s.x, heightAt(s.x, s.z) - 0.1, s.z);
    o.rotation.set(0, r() * 6, 0);
    o.scale.setScalar(s.s);
    o.updateMatrix();
    trunks.setMatrixAt(i, o.matrix);
    if (s.pine) { pines.setMatrixAt(pi, o.matrix); pines.setColorAt(pi++, tint.set(r() < 0.5 ? 0x2f7a4a : 0x3b8a50)); }
    else { rounds.setMatrixAt(ri, o.matrix); rounds.setColorAt(ri++, tint.set(leafColors[Math.floor(r() * (r() < 0.8 ? 4 : 6))])); }
    colliders.push({ type: 'circle', x: s.x, z: s.z, r: 0.45 * s.s });
  });
  rounds.count = ri; pines.count = pi;
  for (const m of [trunks, rounds, pines]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }

  // ---------- rocks & flowers ----------
  const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x9a95a3, flatShading: true }), 46);
  let rk = 0;
  for (let i = 0; i < 600 && rk < 46; i++) {
    const th = r() * Math.PI * 2, rad = Math.sqrt(r()) * 64;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    if (!insideIsland(x, z, 2) || pathDistAt(x, z) < PATH_WIDTH + 1.6 || wildAt(x, z) < 0.6) continue;
    const s = 0.3 + r() * (r() < 0.2 ? 1.6 : 0.6);
    o.position.set(x, heightAt(x, z), z); o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(s, s * 0.7, s);
    o.updateMatrix(); rockMesh.setMatrixAt(rk++, o.matrix);
    if (s > 0.8) colliders.push({ type: 'circle', x, z, r: s * 0.9 });
  }
  rockMesh.count = rk; rockMesh.castShadow = true; scene.add(rockMesh);

  const FL = quality.isMobile ? 500 : 1100;
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), FL);
  const flowerCols = [0xe5394f, 0x2f5fd8, 0xffffff, 0xf2c94c, 0xff8fb1];
  let fl = 0;
  for (let i = 0; i < FL * 6 && fl < FL; i++) {
    const th = r() * Math.PI * 2, rad = Math.sqrt(r()) * 64;
    const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
    const d = pathDistAt(x, z);
    if (!insideIsland(x, z, 1.5) || d < PATH_WIDTH + 0.7 || (d > PATH_WIDTH + 5 && r() < 0.8) || wildAt(x, z) < 0.3) continue;
    o.position.set(x, heightAt(x, z) + 0.22 + r() * 0.12, z); o.scale.setScalar(0.8 + r() * 0.6); o.rotation.set(0, 0, 0);
    o.updateMatrix(); flowers.setMatrixAt(fl, o.matrix); flowers.setColorAt(fl++, tint.set(flowerCols[Math.floor(r() * flowerCols.length)]));
  }
  flowers.count = fl; scene.add(flowers);

  // ---------- path lamps ----------
  const lampPts = pathCurve.getSpacedPoints(38);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x2a3550, metalness: 0.6, roughness: 0.4 }), lampPts.length);
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: PALETTE.cyan, emissive: PALETTE.cyan, emissiveIntensity: 2.5 }), lampPts.length);
  const tan = new THREE.Vector3();
  lampPts.forEach((p, i) => {
    pathCurve.getTangentAt(i / (lampPts.length - 1), tan);
    const side = i % 2 ? 1 : -1;
    const x = p.x - tan.z * side * (PATH_WIDTH + 0.5), z = p.z + tan.x * side * (PATH_WIDTH + 0.5);
    const y = heightAt(x, z);
    o.position.set(x, y + 0.55, z); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
    o.position.y = y + 1.15; o.updateMatrix(); caps.setMatrixAt(i, o.matrix);
    if (i % 2) caps.setColorAt(i, tint.set(PALETTE.red));
  });
  scene.add(poles, caps);

  // ---------- birds ----------
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -0.7, 0, -0.1, 0, 0, -0.2, 0, 0, 0.3, 0.7, 0, -0.1, 0, 0, -0.2], 3));
  birdGeo.computeVertexNormals();
  const birds = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(birdGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x2b3145, side: THREE.DoubleSide }));
    b.userData = { rad: 25 + r() * 40, y: 14 + r() * 14, sp: 0.12 + r() * 0.1, ph: r() * 6 };
    scene.add(b); birds.push(b);
  }
  update.push((t) => {
    for (const b of birds) {
      const d = b.userData, a = t * d.sp + d.ph;
      b.position.set(Math.cos(a) * d.rad, d.y + Math.sin(t + d.ph) * 1.5, Math.sin(a) * d.rad);
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + d.ph) * 0.35, p = b.geometry.attributes.position;
      p.setY(1, flap); p.setY(4, flap); p.needsUpdate = true;
    }
  });

  // ---------- floating motes ----------
  const MC = quality.particles;
  const mg = new THREE.BufferGeometry(), mp = new Float32Array(MC * 3), ms = new Float32Array(MC);
  for (let i = 0; i < MC; i++) {
    const th = r() * Math.PI * 2, rad = Math.sqrt(r()) * 70;
    mp[i * 3] = Math.cos(th) * rad; mp[i * 3 + 1] = 0.5 + r() * 14; mp[i * 3 + 2] = Math.sin(th) * rad; ms[i] = r() * 6.28;
  }
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  mg.setAttribute('aSeed', new THREE.BufferAttribute(ms, 1));
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: windTime, uScale: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ vec3 p = position; p.y += sin(uTime * 0.4 + aSeed) * 1.2; p.x += sin(uTime * 0.2 + aSeed * 2.0) * 1.5;
        vec4 mv = modelViewMatrix * vec4(p,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = 70.0 * uScale / -mv.z; vA = 0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 3.0); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.9, 0.6, smoothstep(0.5, 0.0, d) * vA * 0.8); }`,
  }));
  scene.add(motes);

  return {
    sun,
    colliders,
    setShadows(on) { sun.castShadow = on; },
    update(t) { windTime.value = t; update.forEach((f) => f(t)); },
  };
}

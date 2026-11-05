import * as THREE from 'three';
import { heightAt } from './Terrain.js';
import { STATIONS, BRIDGE, SPAWN_PLATFORM, CITY } from './layout.js';
import { PALETTE, mat, glow, holoMaterial, holoTime, textTexture, signTexture, labelSprite, holoPanel, loadTex, rng, FONT_DISPLAY } from './helpers.js';
import { projects, achievements, education, experience } from '../portfolio/portfolioData.js';

// A local frame for one landmark: origin on the ground at (x, z), local +Z facing `face`.
class Site {
  constructor(ctx, x, z, faceX = 0, faceZ = 0, y = null) {
    this.ctx = ctx;
    this.x = x; this.z = z;
    this.y = y ?? heightAt(x, z);
    this.yaw = Math.atan2(faceX - x, faceZ - z);
    this.group = new THREE.Group();
    this.group.position.set(x, this.y, z);
    this.group.rotation.y = this.yaw;
    ctx.scene.add(this.group);
  }
  world(lx, lz) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return [this.x + lx * c + lz * s, this.z - lx * s + lz * c];
  }
  worldV(lx, ly, lz) { const [x, z] = this.world(lx, lz); return new THREE.Vector3(x, this.y + ly, z); }
  add(obj, lx = 0, ly = 0, lz = 0) { obj.position.set(lx, ly, lz); this.group.add(obj); shadowify(obj); return obj; }
  box(w, h, d, material, lx, ly, lz, collide = true) {
    const m = this.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), lx, ly + h / 2, lz);
    if (collide) { const [x, z] = this.world(lx, lz); this.ctx.colliders.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: this.yaw }); }
    return m;
  }
  cyl(rt, rb, h, material, lx, ly, lz, collide = true, seg = 16) {
    const m = this.add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material), lx, ly + h / 2, lz);
    if (collide) { const [x, z] = this.world(lx, lz); this.ctx.colliders.push({ type: 'circle', x, z, r: Math.max(rt, rb) + 0.05 }); }
    return m;
  }
  floor(radius, height, material, seg = 40) {
    this.cyl(radius, radius + 0.15, height, material, 0, -0.05, 0, false, seg);
    this.ctx.surfaces.push({ type: 'circle', x: this.x, z: this.z, r: radius, y: this.y + height - 0.05 });
  }
  label(text, sub, ly = 7, scale = 1) {
    const s = labelSprite(text, sub, scale);
    s.position.set(0, ly, 0); this.group.add(s);
    this.ctx.update.push((t) => { s.position.y = ly + Math.sin(t * 1.2 + this.x) * 0.12; });
    return s;
  }
  interact(def, lx, ly, lz) {
    this.ctx.interactables.push({ position: this.worldV(lx, ly, lz), radius: 3.2, ...def });
  }
}

function shadowify(o) {
  o.traverse((c) => { if (c.isMesh && !c.material.transparent) { c.castShadow = true; c.receiveShadow = true; } });
}

function codeTexture(lines, color = '#7ff0ff', bg = '#081a33') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 320);
  g.font = '500 24px "IBM Plex Mono", ui-monospace, monospace';
  lines.forEach((l, i) => { g.fillStyle = i % 3 === 0 ? '#ff6b7f' : color; g.fillText(l, 22, 44 + i * 36); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ----------------------------------------------------------------------------------------
export function buildLandmarks(scene) {
  const ctx = { scene, colliders: [], surfaces: [], interactables: [], update: [], refs: {} };
  const S = Object.fromEntries(STATIONS.map((s) => [s.id, s]));
  const r = rng(5);

  const stoneM = mat(0x6e5a3e, { roughness: 1 }); // packed mud instead of pale stone
  const whiteM = mat(0xf2f4f8, { roughness: 0.5 });
  const navyM = mat(PALETTE.navy, { roughness: 0.55, metalness: 0.3 });
  const redM = mat(PALETTE.red, { roughness: 0.5 });
  const blueM = mat(PALETTE.webBlue, { roughness: 0.5 });
  const metalM = mat(PALETTE.metal, { metalness: 0.7, roughness: 0.3 });
  const goldM = mat(PALETTE.gold, { metalness: 0.8, roughness: 0.25 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2 });
  const cyanGlow = glow(PALETTE.cyan, 2.2);
  const redGlow = glow(PALETTE.red, 2);
  const blueGlow = glow(PALETTE.webBlue, 2.2);
  const spin = (o, sp, axis = 'y') => ctx.update.push((t) => { o.rotation[axis] = t * sp; });
  const bob = (o, amp = 0.15, sp = 1.4) => { const y0 = o.position.y; ctx.update.push((t) => { o.position.y = y0 + Math.sin(t * sp + o.id) * amp; }); };

  // ===================== spawn platform & web bridge =====================
  {
    const p = SPAWN_PLATFORM;
    const plat = new THREE.Group(); plat.position.set(p.x, 0, p.z); scene.add(plat);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r - 0.3, 0.6, 32), stoneM); top.position.y = p.y - 0.3; plat.add(top);
    const grassRim = new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.1, 0.18, 6, 40), mat(0x5c9a3f)); grassRim.rotation.x = Math.PI / 2; grassRim.position.y = p.y - 0.05; plat.add(grassRim);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(p.r - 0.3, 9, 9, 3), mat(0x8b8496, { flatShading: true })); rock.rotation.x = Math.PI; rock.position.y = p.y - 5.1; plat.add(rock);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.65, 48), holoMaterial(PALETTE.cyan, 0.9)); ring.rotation.x = -Math.PI / 2; ring.position.y = p.y + 0.02; plat.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.18, 6), holoMaterial(PALETTE.red, 0.9)); ring2.rotation.x = -Math.PI / 2; ring2.position.y = p.y + 0.03; plat.add(ring2);
    spin(ring2, 0.3, 'z');
    shadowify(plat);
    ctx.surfaces.push({ type: 'circle', x: p.x, z: p.z, r: p.r - 0.4, y: p.y });
  }
  {
    const b = BRIDGE, len = b.z1 - b.z0;
    const g = new THREE.Group(); scene.add(g);
    const plank = new THREE.BoxGeometry(b.halfWidth * 2, 0.14, 0.42);
    const plankZs = [];
    for (let z = b.z0 - 0.5; z <= b.z1 + 0.5 + 1e-6; z += 0.5) plankZs.push(z);
    const planks = new THREE.InstancedMesh(plank, mat(0x9a6b45, { roughness: 0.9 }), plankZs.length);
    const o = new THREE.Object3D(); let n = 0;
    for (const z of plankZs) {
      const sag = -Math.sin(((z - b.z0) / len) * Math.PI) * 0.35;
      o.position.set(0, b.y - 0.07 + sag, z); o.rotation.set(0, (r() - 0.5) * 0.04, 0); o.updateMatrix(); planks.setMatrixAt(n++, o.matrix);
    }
    planks.count = n; planks.receiveShadow = planks.castShadow = true; g.add(planks);
    // web railings: posts + catenary ropes + radial web panels between posts
    const pts = [];
    for (const side of [-1, 1]) {
      const x = side * (b.halfWidth + 0.1);
      for (let z = b.z0; z <= b.z1 + 0.01; z += len / 6) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 6), navyM); post.position.set(x, b.y + 0.55, z); g.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), side < 0 ? redGlow : blueGlow); cap.position.set(x, b.y + 1.3, z); g.add(cap);
      }
      const seg = len / 6;
      for (let k = 0; k < 6; k++) {
        const za = b.z0 + k * seg, zb = za + seg, top = b.y + 1.25, cz = (za + zb) / 2, cy = b.y + 0.65;
        // spokes from panel centre to the frame
        for (let a = 0; a < 8; a++) {
          const an = (a / 8) * Math.PI * 2;
          pts.push(x, cy, cz, x, cy + Math.sin(an) * 0.6, cz + Math.cos(an) * seg * 0.48);
        }
        // spiral rings
        for (let ringI = 1; ringI <= 3; ringI++) {
          const f = ringI / 3.4;
          for (let a = 0; a < 8; a++) {
            const a0 = (a / 8) * Math.PI * 2, a1 = ((a + 1) / 8) * Math.PI * 2;
            pts.push(x, cy + Math.sin(a0) * 0.6 * f, cz + Math.cos(a0) * seg * 0.48 * f, x, cy + Math.sin(a1) * 0.6 * f, cz + Math.cos(a1) * seg * 0.48 * f);
          }
        }
        // top rope with a slight sag
        for (let i = 0; i < 6; i++) {
          const z0 = za + (seg * i) / 6, z1 = za + (seg * (i + 1)) / 6;
          const s0 = Math.sin(((z0 - za) / seg) * Math.PI) * 0.12, s1 = Math.sin(((z1 - za) / seg) * Math.PI) * 0.12;
          pts.push(x, top - s0, z0, x, top - s1, z1);
        }
      }
      ctx.colliders.push({ type: 'box', x, z: (b.z0 + b.z1) / 2, hw: 0.15, hd: len / 2 + 1, rot: 0 });
    }
    const web = new THREE.BufferGeometry(); web.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.add(new THREE.LineSegments(web, new THREE.LineBasicMaterial({ color: 0xf4f9ff, transparent: true, opacity: 0.85 })));
    ctx.surfaces.push({ type: 'box', x: 0, z: (b.z0 + b.z1) / 2, hw: b.halfWidth, hd: len / 2 + 1.2, rot: 0, y: b.y, sag: { z0: b.z0, len, amt: 0.35 } });
  }

  // ===================== entrance arch & welcome =====================
  {
    const st = S.intro;
    const site = new Site(ctx, 0, 60.5, 0, 0);
    for (const sx of [-3.6, 3.6]) {
      site.box(0.9, 5.2, 0.9, whiteM, sx, 0, 0);
      site.box(1.05, 0.4, 1.05, navyM, sx, 0, 0, false);
      site.box(0.95, 0.12, 0.95, sx < 0 ? redGlow : blueGlow, sx, 4.4, 0, false);
    }
    site.box(8.4, 0.8, 1.1, navyM, 0, 5.2, 0, false);
    site.box(8.4, 0.12, 1.12, redGlow, 0, 5.15, 0, false);
    site.box(8.4, 0.12, 1.12, blueGlow, 0, 6.0, 0, false);
    const sign = holoPanel(7.6, 1.9, signTexture(['Vaibhav Pokhriyal', 'AI/ML Engineer · Agentic AI · Computer Vision'], { width: 1024, height: 256, sizes: [88, 44] }));
    site.add(sign, 0, 7.4, 0); sign.rotation.y = Math.PI; bob(sign, 0.1, 1);
    const sign2 = sign.clone(); sign2.rotation.y = 0; site.add(sign2, 0, 7.4, 0.02); bob(sign2, 0.1, 1);
    // About kiosk
    const kiosk = new Site(ctx, -4.8, 53.5, 0, 50);
    kiosk.cyl(0.35, 0.5, 1.1, navyM, 0, 0, 0);
    kiosk.box(1.1, 0.05, 0.7, cyanGlow, 0, 1.1, 0, false);
    const kp = holoPanel(1.8, 1.1, signTexture(['About me', 'Press E'], { width: 512, height: 300, sizes: [80, 48] }));
    kp.material.side = THREE.DoubleSide;
    kiosk.add(kp, 0, 2.0, 0); bob(kp, 0.08);
    kiosk.interact({ id: 'about', name: 'About Vaibhav', prompt: 'read about Vaibhav', action: { section: 'about' }, station: 'intro' }, 0, 1.2, 0.6);
    ctx.refs.introSite = st;
  }

  // ===================== 2. Academy (education) =====================
  {
    const st = S.education;
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.floor(5.8, 0.35, stoneM, 8);
    site.box(2.6, 0.17, 1.2, stoneM, 0, 0, 6.2, false);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.abs(Math.sin(a / 2 - Math.PI / 2)) > 0.97) continue; // keep the front open
      site.cyl(0.28, 0.32, 4.2, whiteM, Math.sin(a) * 5, 0.3, Math.cos(a) * 5, true, 10);
    }
    const ringBase = site.add(new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.25, 8, 8), navyM), 0, 4.6, 0); ringBase.rotation.x = Math.PI / 2; ringBase.rotation.z = Math.PI / 8;
    const dome = site.add(new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassM), 0, 4.6, 0);
    dome.castShadow = false;
    for (let i = 0; i < 6; i++) {
      const rib = site.add(new THREE.Mesh(new THREE.TorusGeometry(5, 0.07, 6, 32, Math.PI), whiteM), 0, 4.6, 0);
      rib.rotation.y = (i / 6) * Math.PI;
    }
    const telescope = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.4, 12), navyM); tube.rotation.x = -1.0; telescope.add(tube);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 12), cyanGlow); lens.position.set(0, 1.0, -1.25); lens.rotation.x = -1.0; telescope.add(lens);
    site.add(telescope, 0, 10.6, -0.5);
    spin(telescope, 0.08);
    // floating grad cap & books
    const cap = new THREE.Group();
    cap.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.5), mat(0x1b2340)));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.45, 12), mat(0x1b2340)); crown.position.y = -0.25; cap.add(crown);
    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), goldM); tassel.position.set(0.7, -0.25, 0.7); cap.add(tassel);
    site.add(cap, 0, 2.8, 0); spin(cap, 0.6); bob(cap, 0.18);
    const books = new THREE.Group(); site.add(books, 0, 2.2, 0);
    const bookCols = [PALETTE.red, PALETTE.webBlue, PALETTE.gold, 0x3fb68b, 0xffffff, PALETTE.red];
    bookCols.forEach((c, i) => {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.14), mat(c)); const a = (i / 6) * Math.PI * 2;
      bk.position.set(Math.cos(a) * 1.9, Math.sin(i * 2) * 0.3, Math.sin(a) * 1.9); bk.rotation.y = -a; books.add(bk);
    });
    spin(books, -0.35);
    const ed = education[0];
    const panel = holoPanel(4.2, 1.6, signTexture([ed.institution, ed.degree, ed.period], { width: 1024, height: 400, sizes: [92, 58, 52] }));
    site.add(panel, 0, 4.0, 1.4); bob(panel, 0.06);
    const panelBack = panel.clone(); panelBack.rotation.y = Math.PI; site.add(panelBack, 0, 4.0, 1.38); bob(panelBack, 0.06);
    site.label('The Academy', 'Education', 12.5);
    site.interact({ id: 'education', name: 'The Academy', prompt: 'explore education', action: { section: 'education' }, station: 'education' }, 0, 1.5, 1.2);
    ctx.refs.academy = site;
  }

  // ===================== pavilion builder (workshop + lab) =====================
  function pavilion(st, { wallM, roofM, trimM, w = 10, d = 7.5, h = 4.2, glassFront = false }) {
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.box(w + 0.6, 0.25, d + 0.6, stoneM, 0, -0.05, 0, false);
    ctx.surfaces.push({ type: 'box', x: site.x, z: site.z, hw: (w + 0.6) / 2, hd: (d + 0.6) / 2, rot: site.yaw, y: site.y + 0.2 });
    site.box(w, h, 0.35, wallM, 0, 0.2, -d / 2);
    site.box(0.35, h, d, wallM, -w / 2, 0.2, 0);
    site.box(0.35, h, d, wallM, w / 2, 0.2, 0);
    if (glassFront) {
      for (const sx of [-1, 1]) {
        const gw = (w - 2.6) / 2;
        const g = site.box(gw, h, 0.12, glassM, sx * (1.3 + gw / 2), 0.2, d / 2);
        g.castShadow = false;
      }
    }
    site.box(w + 1.2, 0.35, d + 1.4, roofM, 0, h + 0.2, 0.2, false);
    site.box(w + 1.24, 0.14, 0.1, trimM, 0, h + 0.3, d / 2 + 0.92, false);
    return site;
  }

  // ===================== 3. Tech Workshop (skills) =====================
  {
    const st = S.skills;
    const site = pavilion(st, { wallM: mat(0xe9edf3), roofM: navyM, trimM: redGlow });
    // workbench with terminals
    site.box(6.5, 0.9, 1.1, mat(0x3a4560, { metalness: 0.4 }), 0, 0.2, -2.7);
    const snippets = [
      ['import torch', 'from torch_geometric.nn import GATConv', 'model = YOLO("yolov8n.pt")', 'cv2.VideoCapture(0)', 'mp.solutions.hands', 'app = FastAPI()', 'docker compose up'],
      ['from langchain import ...', 'retriever = faiss.as_retriever()', 'tok = BertTokenizer(...)', 'df = pd.read_csv(...)', 'git push origin main', 'st.title("IntelliGuard")'],
      ['class GAT_BiLSTM(nn.Module):', '  def forward(self, x, edge):', '    h = self.gat(x, edge)', '    return self.lstm(h)', '# 100+ DSA problems solved', 'loss.backward()'],
    ];
    snippets.forEach((lines, i) => {
      const x = (i - 1) * 2.1;
      site.box(0.12, 0.35, 0.12, navyM, x, 1.1, -2.9, false);
      const scr = site.add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: codeTexture(lines), toneMapped: false })), x, 2.05, -2.85);
      scr.rotation.x = -0.12;
      site.box(1.95, 1.22, 0.06, navyM, x, 1.44, -2.92, false);
    });
    // neural-network visualisation: three layers of nodes with pulsing links
    const nn = new THREE.Group(); site.add(nn, 0, 2.2, 0.3);
    const layers = [4, 6, 6, 3], nodes = [];
    const nodeGeo = new THREE.SphereGeometry(0.11, 10, 8);
    layers.forEach((n, li) => {
      const row = [];
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(nodeGeo, li % 2 ? redGlow : cyanGlow);
        m.position.set((li - 1.5) * 0.9, (k - (n - 1) / 2) * 0.42, 0); nn.add(m); row.push(m.position);
      }
      nodes.push(row);
    });
    const lp = [];
    for (let li = 0; li < nodes.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) lp.push(a.x, a.y, a.z, b.x, b.y, b.z);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    const linkMat = new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    nn.add(new THREE.LineSegments(lg, linkMat));
    ctx.update.push((t) => { nn.rotation.y = Math.sin(t * 0.4) * 0.6; linkMat.opacity = 0.25 + 0.2 * Math.sin(t * 3); });
    // robotic arm (nod to the robotics club)
    const arm = new THREE.Group(); site.add(arm, 3.6, 0.2, -1.2);
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 12), mat(0xf2b33d, { metalness: 0.5 })));
    const j1 = new THREE.Group(); j1.position.y = 0.3; arm.add(j1);
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.3, 0.22), whiteM); s1.position.y = 0.65; j1.add(s1);
    const j2 = new THREE.Group(); j2.position.y = 1.3; j1.add(j2);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), whiteM); s2.position.y = 0.5; j2.add(s2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), redGlow); tip.position.y = 1.0; j2.add(tip);
    shadowify(arm);
    ctx.colliders.push({ type: 'circle', x: site.world(3.6, -1.2)[0], z: site.world(3.6, -1.2)[1], r: 0.5 });
    ctx.update.push((t) => { arm.rotation.y = Math.sin(t * 0.7) * 1.2; j1.rotation.z = 0.4 + Math.sin(t * 1.1) * 0.3; j2.rotation.z = 0.9 + Math.sin(t * 1.3) * 0.4; });
    // floating category glyphs above the roof
    const ring = new THREE.Group(); site.add(ring, 0, 6.3, 0);
    ['Python', 'PyTorch', 'OpenCV', 'LangChain', 'YOLOv8', 'FastAPI', 'BERT', 'Docker'].forEach((s, i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(s, { width: 512, height: 128, sizes: [64] }), transparent: true, depthWrite: false }));
      const a = (i / 8) * Math.PI * 2; sp.position.set(Math.cos(a) * 3.6, Math.sin(i * 1.7) * 0.3, Math.sin(a) * 3.6); sp.scale.set(2.4, 0.6, 1); ring.add(sp);
    });
    spin(ring, 0.25);
    site.label('Skills', '', 9.2);
    site.interact({ id: 'skills', name: 'Skills', prompt: 'browse skills', action: { section: 'skills' }, station: 'skills' }, 0, 1.4, 0.2);
  }

  // ===================== 4. Neuro Research Lab (experience) =====================
  {
    const st = S.experience;
    const site = pavilion(st, { wallM: mat(0xf6f7fb), roofM: mat(0x2a3a66), trimM: cyanGlow, glassFront: true });
    // EEG multi-channel waveform hologram
    const CH = 8, PTS = 120;
    const eegGeo = new THREE.BufferGeometry();
    const eegPos = new Float32Array(CH * (PTS - 1) * 2 * 3);
    eegGeo.setAttribute('position', new THREE.BufferAttribute(eegPos, 3));
    const eeg = new THREE.LineSegments(eegGeo, new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    site.add(eeg, 0, 2.3, -2.9);
    const frame = site.add(new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), holoMaterial(0x1d5fa8, 0.35)), 0, 2.3, -2.95);
    const eegLabel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.4), new THREE.MeshBasicMaterial({ map: signTexture('EEG · CHB-MIT · seizure detection', { width: 1024, height: 128, sizes: [54] }), transparent: true, depthWrite: false }));
    site.add(eegLabel, 0, 3.85, -2.9);
    ctx.update.push((t) => {
      let k = 0;
      for (let c = 0; c < CH; c++) {
        const y0 = (c - (CH - 1) / 2) * 0.28, burst = c === 3 || c === 4 ? 1 : 0;
        let px, py;
        for (let i = 0; i < PTS; i++) {
          const x = -2.6 + (i / (PTS - 1)) * 5.2, ph = i * 0.35 - t * 6 + c;
          const spike = burst * Math.max(0, Math.sin(t * 0.8)) * Math.sin(ph * 2.3) * 0.14;
          const y = y0 + Math.sin(ph) * 0.04 + Math.sin(ph * 2.7 + c) * 0.03 + spike;
          if (i > 0) { eegPos.set([px, py, 0.02, x, y, 0.02], k); k += 6; }
          px = x; py = y;
        }
      }
      eegGeo.attributes.position.needsUpdate = true;
    });
    // brain graph (graph attention network motif)
    const brain = new THREE.Group(); site.add(brain, 0, 2.0, 0.6);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, wireframe: true, transparent: true, opacity: 0.35 }));
    shell.scale.set(1.2, 0.95, 1); brain.add(shell);
    const bp = []; const bn = [];
    for (let i = 0; i < 18; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.55 + r() * 0.35); v.x *= 1.2; bn.push(v); const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), i % 4 ? cyanGlow : redGlow); m.position.copy(v); brain.add(m); }
    bn.forEach((a, i) => bn.forEach((b, j) => { if (j > i && a.distanceTo(b) < 0.62) bp.push(a.x, a.y, a.z, b.x, b.y, b.z); }));
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    brain.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: PALETTE.red, transparent: true, opacity: 0.7 })));
    spin(brain, 0.4); bob(brain, 0.1);
    site.cyl(0.5, 0.6, 1.0, navyM, 0, 0.2, 0.6, true, 12);
    site.box(1.3, 0.06, 1.3, cyanGlow, 0, 1.2, 0.6, false);
    // logo plaques on the side walls: IIT Delhi on the left, Mind Masters AI on the right
    const plaque = (id, w, h, x, rotY) => {
      const e = experience.find((x) => x.id === id);
      if (!e?.logo) return;
      const m = site.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: loadTex(e.logo), toneMapped: false })), x, 2.4, -1.4);
      m.rotation.y = rotY;
    };
    plaque('iitd', 1.3, 1.37, -4.78, Math.PI / 2);
    plaque('mindmasters', 1.3, 1.3, 4.78, -Math.PI / 2);
    // lab benches with flasks
    for (const sx of [-3.2, 3.2]) {
      site.box(1.2, 0.95, 2.6, whiteM, sx, 0.2, -0.6);
      for (let k = 0; k < 3; k++) {
        const fl = site.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), glow([PALETTE.cyan, PALETTE.red, 0x7dff9b][k], 1.4)), sx, 1.35, -1.5 + k * 0.9);
        bob(fl, 0.04, 2 + k);
      }
    }
    site.label('Experience', 'IIT Delhi · Mind Masters AI', 9.2);
    site.interact({ id: 'experience', name: 'Experience', prompt: 'open experience', action: { section: 'experience' }, station: 'experience' }, 0, 1.4, 1.6);
  }

  // ===================== 5. Project Hall =====================
  {
    const st = S.projects;
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.label('Project Hall', `${projects.length} projects · walk up to each`, 9.5, 1.1);
    // centre hologram
    const core = new THREE.Group(); site.add(core, 0, 2.6, 0);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), holoMaterial(PALETTE.cyan, 0.8)); core.add(cube);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25, 1.25, 1.25)), new THREE.LineBasicMaterial({ color: PALETTE.cyan })); core.add(edges);
    for (let i = 0; i < 2; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(1.4 + i * 0.35, 0.025, 8, 64), cyanGlow); rr.rotation.x = Math.PI / 2 + i * 0.6; core.add(rr); spin(rr, 0.6 + i * 0.4, 'z'); }
    ctx.update.push((t) => { cube.rotation.set(t * 0.4, t * 0.6, 0); edges.rotation.copy(cube.rotation); });
    site.cyl(0.8, 1.0, 0.8, navyM, 0, 0, 0, true, 6);
    site.interact({ id: 'projects', name: 'Project Hall', prompt: 'browse all projects', action: { section: 'projects' }, station: 'projects' }, 0, 1.2, 1.6);
    // emblem builders
    const emblems = {
      netravaani() {
        // an eye with a bio-signal wave running through it
        const g = new THREE.Group();
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12), whiteM); eye.scale.y = 0.55; g.add(eye);
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), glow(PALETTE.cyan, 2)); iris.position.z = 0.3; g.add(iris);
        const wave = new THREE.CatmullRomCurve3(Array.from({ length: 14 }, (_, i) => new THREE.Vector3((i - 6.5) * 0.09, Math.sin(i * 1.4) * (i % 4 === 2 ? 0.35 : 0.08), 0.42)));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(wave, 60, 0.025, 6), glow(PALETTE.red, 2)));
        return g;
      },
      leopard() {
        // a surveillance camera with a detection box
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.32), whiteM); g.add(body);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 14), glow(0xffb340, 2)); lens.rotation.x = Math.PI / 2; lens.position.set(0.2, 0, 0.2); g.add(lens);
        const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.6, 0.02)), new THREE.LineBasicMaterial({ color: 0xffb340 }));
        box.position.set(0, 0, 0.5); g.add(box);
        return g;
      },
      intelliguard() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.4), whiteM); g.add(body);
        const lensM = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.25, 12), navyM); lensM.rotation.x = Math.PI / 2; lensM.position.z = 0.3; g.add(lensM);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), redGlow); led.position.set(0.25, 0.12, 0.21); g.add(led);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 16, 1, true), holoMaterial(PALETTE.red, 0.35)); cone.rotation.x = -Math.PI / 2; cone.position.z = 1.1; g.add(cone);
        return g;
      },
      neurograph() {
        const g = new THREE.Group(); const pts = [];
        for (let i = 0; i < 10; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.5); pts.push(v); const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), i % 3 ? cyanGlow : redGlow); m.position.copy(v); g.add(m); }
        const lp = []; pts.forEach((a, i) => pts.forEach((b, j) => { if (j > i && a.distanceTo(b) < 0.7) lp.push(a.x, a.y, a.z, b.x, b.y, b.z); }));
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: PALETTE.cyan })));
        return g;
      },
      'yt-copilot'() {
        const g = new THREE.Group();
        const shape = new THREE.Shape(); const w = 0.5, h = 0.34, rr = 0.1;
        shape.moveTo(-w + rr, -h); shape.lineTo(w - rr, -h); shape.quadraticCurveTo(w, -h, w, -h + rr); shape.lineTo(w, h - rr); shape.quadraticCurveTo(w, h, w - rr, h);
        shape.lineTo(-w + rr, h); shape.quadraticCurveTo(-w, h, -w, h - rr); shape.lineTo(-w, -h + rr); shape.quadraticCurveTo(-w, -h, -w + rr, -h);
        g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }), redM));
        const tri = new THREE.Shape(); tri.moveTo(-0.1, -0.16); tri.lineTo(0.18, 0); tri.lineTo(-0.1, 0.16);
        const tm = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false }), whiteM); tm.position.z = 0.12; g.add(tm);
        return g;
      },
      visioncontrol() {
        const g = new THREE.Group();
        const J = { head: [0, 0.62], neck: [0, 0.45], hipC: [0, 0], lh: [-0.42, 0.7], rh: [0.45, 0.3], le: [-0.25, 0.55], re: [0.3, 0.42], lk: [-0.2, -0.32], rk: [0.25, -0.2], lf: [-0.2, -0.68], rf: [0.42, -0.45] };
        const bones = [['neck', 'hipC'], ['neck', 'le'], ['le', 'lh'], ['neck', 're'], ['re', 'rh'], ['hipC', 'lk'], ['lk', 'lf'], ['hipC', 'rk'], ['rk', 'rf']];
        const lp = []; bones.forEach(([a, b]) => lp.push(J[a][0], J[a][1], 0, J[b][0], J[b][1], 0));
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: PALETTE.cyan })));
        Object.entries(J).forEach(([k, [x, y]]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(k === 'head' ? 0.12 : 0.05, 8, 6), k === 'head' ? whiteM : redGlow); m.position.set(x, y, 0); g.add(m); });
        return g;
      },
      bert() {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.03), whiteM); p.position.set(i * 0.12 - 0.12, i * 0.06, -i * 0.08); p.rotation.z = (i - 1) * 0.1; g.add(p); }
        for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.01), i === 1 ? redGlow : blueGlow); l.position.set(0.12, 0.3 - i * 0.14, 0.04); g.add(l); }
        const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 6), goldM); tag.rotation.x = Math.PI / 2; tag.position.set(0.38, -0.35, 0.06); g.add(tag);
        return g;
      },
      airsketch() {
        const g = new THREE.Group();
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.9) * 0.45, (i - 6) * 0.08, Math.cos(i * 1.3) * 0.25)));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.035, 6), glow(0xff5fa2, 2)));
        const tipM = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glow(0xffffff, 2)); tipM.position.copy(curve.getPoint(1)); g.add(tipM);
        return g;
      },
    };
    const N = projects.length, R = N > 6 ? 8.6 : 7.8, SPREAD = Math.min(170, 24 * (N - 1));
    projects.forEach((p, i) => {
      const a = THREE.MathUtils.degToRad(-SPREAD / 2 + (SPREAD * i) / (N - 1));
      const lx = Math.sin(a) * R, lz = -Math.cos(a) * R;
      const ped = new Site(ctx, ...site.world(lx, lz), site.x, site.z);
      ped.cyl(0.85, 1.0, 1.0, navyM, 0, 0, 0, true, 6);
      ped.add(new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.04, 6, 6), i % 2 ? redGlow : cyanGlow), 0, 1.0, 0).rotation.x = Math.PI / 2;
      const em = (emblems[p.id] || emblems.intelliguard)(); ped.add(em, 0, 1.75, 0); spin(em, 0.7 + i * 0.05); bob(em, 0.1);
      const tex = p.image ? loadTex(p.image) : textTexture([p.name, p.tagline], { width: 1024, height: 584, bg: '#0d1b3a', sizes: [96, 44] });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(p.imageAspect ? Math.min(2.9, 1.65 * p.imageAspect) : 2.9, 1.65), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
      ped.add(scr, 0, 3.55, -0.2); bob(scr, 0.06, 1.1);
      const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 1.8), holoMaterial(i % 2 ? PALETTE.red : PALETTE.cyan, 0.6)); ped.add(fr, 0, 3.55, -0.23); bob(fr, 0.06, 1.1);
      const nm = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.42), new THREE.MeshBasicMaterial({ map: signTexture(p.name, { width: 1024, height: 148, sizes: [78] }), transparent: true, depthWrite: false }));
      ped.add(nm, 0, 4.75, -0.2); bob(nm, 0.06, 1.1);
      ped.interact({ id: `project-${p.id}`, name: p.name, prompt: `inspect ${p.name}`, action: { section: 'projects', item: p.id }, station: 'projects' }, 0, 1.2, 1.1);
      ctx.interactables[ctx.interactables.length - 1].radius = 2.4;
    });
  }

  // ===================== 6. Trophy plaza (achievements) =====================
  {
    const st = S.achievements;
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.floor(6, 0.3, mat(0x253259, { roughness: 0.6 }), 40);
    site.add(new THREE.Mesh(new THREE.TorusGeometry(6, 0.06, 6, 64), glow(PALETTE.gold, 2)), 0, 0.27, 0).rotation.x = Math.PI / 2;
    const trophy = (metal) => {
      const g = new THREE.Group();
      const prof = [[0, 0], [0.32, 0], [0.32, 0.08], [0.12, 0.14], [0.08, 0.45], [0.12, 0.55], [0.38, 0.75], [0.45, 1.15], [0.42, 1.18], [0.0, 1.18]].map(([x, y]) => new THREE.Vector2(x, y));
      g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), metal));
      for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 16, Math.PI), metal); h.position.set(sx * 0.45, 0.92, 0); h.rotation.z = sx * -Math.PI / 2; g.add(h); }
      return g;
    };
    const medal = () => {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), goldM); disc.rotation.x = Math.PI / 2; disc.position.y = 0.6; g.add(disc);
      const star = new THREE.Shape(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 0.12 : 0.3, a = (k / 10) * Math.PI * 2 + Math.PI / 2; k ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const sm = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), redM); sm.position.set(0, 0.6, 0.04); g.add(sm);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.02), blueM); ribbon.position.y = 1.1; g.add(ribbon);
      return g;
    };
    const items = [
      { a: achievements.find((x) => x.id === 'blindbot'), lx: -3.2, h: 1.1, obj: trophy(mat(0xd9dee8, { metalness: 0.9, roughness: 0.2 })), col: 0xd9dee8 },
      { a: achievements.find((x) => x.id === 'saarthi'), lx: 0, h: 1.4, obj: medal(), col: PALETTE.gold },
      { a: achievements.find((x) => x.id === 'nano'), lx: 3.2, h: 0.85, obj: trophy(mat(0xc7834a, { metalness: 0.85, roughness: 0.3 })), col: 0xc7834a },
    ];
    items.forEach(({ a, lx, h, obj, col }) => {
      site.box(1.6, h, 1.6, whiteM, lx, 0.25, -1.5);
      site.box(1.64, 0.1, 1.64, glow(col, 1.5), lx, 0.25 + h - 0.05, -1.5, false);
      site.add(obj, lx, 0.5 + h, -1.5); spin(obj, 0.8); bob(obj, 0.12);
      const beam = site.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 6, 20, 1, true), holoMaterial(col, 0.25)), lx, 0.25 + h + 3, -1.5);
      beam.castShadow = false;
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: signTexture([a.place, a.title], { width: 512, height: 170, sizes: [48, 36] }), transparent: true, depthWrite: false }));
      site.add(plaque, lx, 0.25 + h * 0.5, -0.69);
      site.interact({ id: `ach-${a.id}`, name: a.title, prompt: `view ${a.title}`, action: { section: 'achievements', item: a.id }, station: 'achievements' }, lx, 1, 0);
      ctx.interactables[ctx.interactables.length - 1].radius = 2.2;
    });
    // micromouse maze model beside the plaza (Nano Navigator)
    const maze = new THREE.Group(); site.add(maze, 4.4, 0.3, 2.4);
    maze.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 2), mat(0x111a33)));
    const walls = ['1111111', '1000101', '1110101', '1000001', '1011101', '1000100', '1111111'];
    walls.forEach((row, j) => [...row].forEach((c, i) => { if (c === '1') { const w = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.28), whiteM); w.position.set((i - 3) * 0.28, 0.12, (j - 3) * 0.28); maze.add(w); } }));
    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.2), redGlow); maze.add(mouse);
    const route = [[1, 1], [1, 3], [2, 3], [3, 3], [3, 1], [4, 1], [5, 1], [5, 3], [5, 5]].map(([i, j]) => new THREE.Vector3((i - 3) * 0.28, 0.1, (j - 3) * 0.28));
    const routeCurve = new THREE.CatmullRomCurve3(route, false, 'catmullrom', 0.1);
    ctx.update.push((t) => {
      const u = (t * 0.06) % 1, p = routeCurve.getPointAt(u), q = routeCurve.getPointAt(Math.min(1, u + 0.01));
      mouse.position.copy(p); mouse.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    });
    ctx.colliders.push({ type: 'circle', x: site.world(4.4, 2.4)[0], z: site.world(4.4, 2.4)[1], r: 1.3 });
    shadowify(maze);
    // soccer ball for BlindBot
    const ball = site.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), mat(0xffffff, { flatShading: true })), -4.6, 0.65, 2.0);
    spin(ball, 1.2, 'x');
    ctx.refs.trophySite = site;
    site.label('Achievements', '', 7.5);
  }

  // ===================== 7. VISOR control center =====================
  {
    const st = S.visor;
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.floor(6.4, 0.45, mat(0x1b2547, { metalness: 0.5, roughness: 0.35 }), 48);
    for (let k = 0; k < 3; k++) site.add(new THREE.Mesh(new THREE.TorusGeometry(6.35 - k * 1.6, 0.05, 6, 80), k === 1 ? redGlow : cyanGlow), 0, 0.42, 0).rotation.x = Math.PI / 2;
    site.box(2.2, 0.22, 0.6, stoneM, 0, -0.05, 6.6, false);
    site.cyl(0.9, 1.2, 1.1, navyM, 0, 0.4, 0, true, 24);
    const core = new THREE.Group(); site.add(core, 0, 3.4, 0);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), new THREE.MeshBasicMaterial({ color: PALETTE.cyan, wireframe: true }));
    const orbIn = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), glow(PALETTE.cyan, 3));
    core.add(orb, orbIn);
    const rings = [1.3, 1.75, 2.2].map((rad, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.035, 8, 96, Math.PI * (1.4 + i * 0.2)), i === 1 ? glow(PALETTE.gold, 2) : cyanGlow);
      core.add(m); return m;
    });
    ctx.update.push((t) => {
      rings[0].rotation.set(t * 0.8, 0, t * 0.3); rings[1].rotation.set(Math.PI / 2, t * 0.6, 0); rings[2].rotation.set(t * 0.3, t * 0.5, t * 0.2);
      orb.rotation.y = t * 0.5; const s = 1 + Math.sin(t * 2.4) * 0.06; orbIn.scale.setScalar(s);
    });
    const labels = ['About', 'Skills', 'Projects', 'Experience', 'Education', 'Achievements', 'GitHub', 'Contact'];
    const panelRing = new THREE.Group(); site.add(panelRing, 0, 2.6, 0);
    labels.forEach((l, i) => {
      const a = (i / labels.length) * Math.PI * 2;
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: signTexture(l, { width: 512, height: 170, sizes: [70], glowColor: i % 3 === 1 ? '#ff6b7a' : '#4fe3ff' }), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      pm.position.set(Math.sin(a) * 3.8, Math.sin(i) * 0.4, Math.cos(a) * 3.8); pm.rotation.y = a; panelRing.add(pm);
    });
    spin(panelRing, 0.15);
    // hexagonal energy shield standing behind the core
    const hex = new THREE.Mesh(new THREE.CircleGeometry(2.4, 6), holoMaterial(PALETTE.webBlue, 0.45)); site.add(hex, 0, 3.2, -5.2);
    const hexEdge = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.45, 6), glow(PALETTE.cyan, 2)); site.add(hexEdge, 0, 3.2, -5.18);
    const hexV = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ map: textTexture('V', { width: 256, height: 256, sizes: [190] }), transparent: true, depthWrite: false })); site.add(hexV, 0, 3.2, -5.15);
    site.box(0.25, 2.2, 0.25, navyM, 0, 0.4, -5.2);
    site.label('VISOR', 'Portfolio control center', 7.6);
    site.interact({ id: 'visor', name: 'VISOR', prompt: 'access VISOR', action: { section: 'visor' }, station: 'visor' }, 0, 1.5, 1.6);
    ctx.interactables[ctx.interactables.length - 1].radius = 3.8;
    ctx.refs.visorSite = site;
  }

  // ===================== 8. Comm tower (contact) =====================
  {
    const st = S.contact;
    const site = new Site(ctx, st.site[0], st.site[1], st.spot[0], st.spot[1]);
    site.floor(4.6, 0.3, stoneM, 8);
    const H = 13, legs = [[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]];
    const tower = new THREE.Group(); site.add(tower, 0, 0.25, -1.2);
    const lp = [];
    legs.forEach(([x, z], i) => {
      const [nx, nz] = legs[(i + 1) % 4];
      lp.push(x, 0, z, x * 0.25, H, z * 0.25);
      for (let k = 0; k < 6; k++) {
        const f0 = k / 6, f1 = (k + 1) / 6, s0 = 1 - f0 * 0.75, s1 = 1 - f1 * 0.75;
        lp.push(x * s0, f0 * H, z * s0, nx * s1, f1 * H, nz * s1, nx * s0, f0 * H, nz * s0, x * s1, f1 * H, z * s1, x * s1, f1 * H, z * s1, nx * s1, f1 * H, nz * s1);
      }
    });
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    tower.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xe8ecf4 })));
    legs.forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, H * 1.003, 6), mat(0xe8ecf4, { metalness: 0.5 }));
      leg.position.set(x * 0.625, H / 2, z * 0.625);
      const dir = new THREE.Vector3(x * 0.25 - x, H, z * 0.25 - z).normalize(); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      tower.add(leg);
    });
    ctx.colliders.push({ type: 'circle', x: site.world(0, -1.2)[0], z: site.world(0, -1.2)[1], r: 1.9 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.2), mat(0xf4f6fa, { side: THREE.DoubleSide, metalness: 0.4 }));
    dish.rotation.x = -Math.PI / 2 - 0.5; const dishHolder = new THREE.Group(); dishHolder.add(dish); dishHolder.position.y = H * 0.72; tower.add(dishHolder);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), metalM); feed.rotation.x = Math.PI / 2 - 0.5; feed.position.set(0, 0.3, 0.55); dishHolder.add(feed);
    spin(dishHolder, 0.2);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), redGlow); beacon.position.y = H + 0.3; tower.add(beacon);
    const beaconLight = new THREE.PointLight(PALETTE.red, 30, 12); beaconLight.position.y = H + 0.3; tower.add(beaconLight);
    ctx.update.push((t) => { const on = Math.sin(t * 3) > 0.3; beacon.material = on ? redGlow : redM; beaconLight.intensity = on ? 30 : 0; });
    // broadcast rings
    for (let k = 0; k < 3; k++) {
      const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 48), holoMaterial(PALETTE.cyan, 0.8)); wave.rotation.x = Math.PI / 2; tower.add(wave);
      ctx.update.push((t) => { const u = (t * 0.35 + k / 3) % 1; wave.position.y = H + 0.3; wave.scale.setScalar(0.5 + u * 6); wave.material.uniforms.uOpacity.value = (1 - u) * 0.8; });
    }
    const panel = holoPanel(3.4, 1.5, signTexture(['Thanks for exploring', "Let's build something together"], { width: 1024, height: 300, sizes: [78, 52] }));
    panel.material.side = THREE.DoubleSide;
    site.add(panel, 0, 2.6, 1.6); bob(panel, 0.08);
    // bench facing the sky
    const bench = new Site(ctx, ...site.world(2.8, -3.2), ...site.world(6, -12));
    bench.box(2.2, 0.45, 0.6, mat(0x9a6b45), 0, 0, 0);
    bench.box(2.2, 0.6, 0.12, mat(0x9a6b45), 0, 0.45, -0.3, false);
    site.label('Comm Tower', 'Contact', 15.5, 1.1);
    site.interact({ id: 'contact', name: 'Comm Tower', prompt: 'open contact', action: { section: 'contact' }, station: 'contact' }, 0, 1.2, 1.8);
  }

  // ===================== central tower =====================
  {
    const site = new Site(ctx, 0, 0, 0, 1, 1.2);
    site.floor(8, 0.3, stoneM, 48);
    // energy reactor ring around the base
    const reactor = site.add(new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.22, 10, 64), glow(PALETTE.cyan, 2.5)), 0, 0.5, 0); reactor.rotation.x = Math.PI / 2;
    const reactorIn = site.add(new THREE.Mesh(new THREE.RingGeometry(4.9, 5.3, 64), holoMaterial(PALETTE.cyan, 0.7)), 0, 0.31, 0); reactorIn.rotation.x = -Math.PI / 2;
    ctx.update.push((t) => { reactor.material.emissiveIntensity = 2 + Math.sin(t * 2) * 0.6; });
    site.cyl(4.2, 4.6, 1.2, navyM, 0, 0.25, 0, true, 8);
    const tiers = [[3.4, 3.8, 6, whiteM], [2.8, 3.2, 6, whiteM], [2.0, 2.6, 6, whiteM], [1.3, 1.8, 5, whiteM]];
    let y = 1.45;
    tiers.forEach(([rt, rb, h, m], i) => {
      site.cyl(rt, rb, h, m, 0, y, 0, i === 0, 8);
      const band = site.add(new THREE.Mesh(new THREE.CylinderGeometry(rb + 0.03, rb + 0.03, 0.35, 8, 1, true), i % 2 ? redGlow : cyanGlow), 0, y + 0.4, 0);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const win = site.add(new THREE.Mesh(new THREE.PlaneGeometry(rt * 0.55, h * 0.55), glow(0x9fe8ff, 0.8)), Math.sin(a) * (rt + rb) * 0.5 * 0.94, y + h * 0.55, Math.cos(a) * (rt + rb) * 0.5 * 0.94);
        win.rotation.y = a; win.rotation.x = -Math.atan2(rb - rt, h) * 0;
      }
      y += h;
      site.cyl(rt + 0.35, rt + 0.35, 0.3, goldM, 0, y - 0.15, 0, false, 8);
    });
    const spire = site.add(new THREE.Mesh(new THREE.ConeGeometry(0.6, 6, 8), goldM), 0, y + 3, 0);
    const topRing = site.add(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.08, 8, 64), cyanGlow), 0, y + 2, 0);
    const topRing2 = site.add(new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.05, 8, 64), redGlow), 0, y + 2.6, 0);
    ctx.update.push((t) => { topRing.rotation.set(Math.PI / 2 + Math.sin(t * 0.5) * 0.3, t * 0.4, 0); topRing2.rotation.set(Math.PI / 2 + Math.cos(t * 0.4) * 0.35, 0, t * 0.3); });
    const emblem = holoPanel(3, 3, textTexture('V', { width: 256, height: 256, sizes: [200] }), PALETTE.cyan, 1, { solid: false });
    site.add(emblem, 0, y + 2.3, 0); spin(emblem, 0.5);
    ctx.refs.towerTop = new THREE.Vector3(0, 1.2 + y + 4, 0);
    // quadcopter drone circling the tower (robotics nod)
    const drone = new THREE.Group();
    drone.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), navyM));
    const props = [];
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      const armM = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.72), whiteM); armM.position.set(x / 2, 0, z / 2); armM.rotation.y = Math.atan2(x, z); drone.add(armM);
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.05), mat(0x222222)); prop.position.set(x, 0.1, z); drone.add(prop); props.push(prop);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), x < 0 ? redGlow : cyanGlow); led.position.set(x, -0.04, z); drone.add(led);
    }
    drone.scale.setScalar(1.4);
    scene.add(drone); shadowify(drone);
    ctx.update.push((t) => {
      const a = t * 0.35;
      drone.position.set(Math.cos(a) * 11, 14 + Math.sin(t * 1.3) * 1.2, Math.sin(a) * 11);
      drone.rotation.y = -a; drone.rotation.z = 0.15;
      props.forEach((p, i) => { p.rotation.y = t * 40 + i; });
    });
  }

  // ===================== city corner (spider-inspired) =====================
  {
    const site = new Site(ctx, CITY.x, CITY.z, 38, -14);
    const winTex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#26345f'; g.fillRect(0, 0, 128, 256);
      for (let y = 8; y < 256; y += 20) for (let x = 8; x < 128; x += 20) { g.fillStyle = Math.random() < 0.55 ? '#ffd98a' : '#3d4f86'; g.fillRect(x, y, 11, 13); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    })();
    const blds = [[-5, -3, 3, 11], [-1.2, -5, 3.4, 15], [3, -3.5, 3, 9], [6, 0.5, 2.6, 12], [-6, 2.5, 2.6, 7], [2.2, 2.8, 2.4, 6], [-2, 1.5, 2.2, 8.5]];
    const tops = [];
    blds.forEach(([lx, lz, w, h], i) => {
      const m = new THREE.MeshStandardMaterial({ map: winTex.clone(), roughness: 0.6, emissive: 0xffd98a, emissiveIntensity: 0.12, emissiveMap: null });
      m.map.repeat.set(w / 2.5, h / 5); m.map.needsUpdate = true;
      site.box(w, h, w, m, lx, 0, lz);
      site.box(w + 0.2, 0.18, w + 0.2, i % 2 ? redGlow : blueGlow, lx, h, lz, false);
      // water tower on some roofs
      if (i % 3 === 0) {
        site.cyl(0.5, 0.5, 0.9, mat(0x8a5a3a), lx + w * 0.2, h + 0.7, lz, false, 10);
        site.add(new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.45, 10), mat(0x5a3b26)), lx + w * 0.2, h + 1.8, lz);
        for (const sx of [-0.3, 0.3]) site.box(0.06, 0.7, 0.06, navyM, lx + w * 0.2 + sx, h, lz, false);
      }
      tops.push(site.worldV(lx, h + 0.2, lz));
    });
    // web strands between rooftops + one radial web spanning two towers
    const wp = [];
    const strand = (a, b, sag = 0.8) => { for (let i = 0; i < 12; i++) { const p = a.clone().lerp(b, i / 12), q = a.clone().lerp(b, (i + 1) / 12); p.y -= Math.sin((i / 12) * Math.PI) * sag; q.y -= Math.sin(((i + 1) / 12) * Math.PI) * sag; wp.push(p.x, p.y, p.z, q.x, q.y, q.z); } };
    strand(tops[0], tops[1]); strand(tops[1], tops[3], 1.4); strand(tops[1], tops[2]); strand(tops[4], tops[0]); strand(tops[6], tops[5], 0.5);
    {
      const A = site.worldV(-5, 7.5, -1.5), B = site.worldV(-1.2, 9, -3.3), C = A.clone().lerp(B, 0.5);
      const rad = A.distanceTo(B) * 0.48, up = new THREE.Vector3(0, 1, 0), along = B.clone().sub(A).normalize();
      for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2; const p = C.clone().addScaledVector(along, Math.cos(an) * rad).addScaledVector(up, Math.sin(an) * rad); wp.push(C.x, C.y, C.z, p.x, p.y, p.z); }
      for (let ring = 1; ring <= 4; ring++) for (let k = 0; k < 10; k++) {
        const f = ring / 4.4, a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
        const p = C.clone().addScaledVector(along, Math.cos(a0) * rad * f).addScaledVector(up, Math.sin(a0) * rad * f);
        const q = C.clone().addScaledVector(along, Math.cos(a1) * rad * f).addScaledVector(up, Math.sin(a1) * rad * f);
        wp.push(p.x, p.y, p.z, q.x, q.y, q.z);
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));

    // Vaibhav's prototype suit in a glass case (original design)
    const caseSite = new Site(ctx, ...site.world(2.5, 7.4), 38, -12);
    caseSite.box(1.6, 0.4, 1.6, navyM, 0, 0, 0);
    const glassCase = caseSite.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 1.5), glassM), 0, 1.6, 0); glassCase.castShadow = false;
    caseSite.box(1.6, 0.15, 1.6, navyM, 0, 2.8, 0, false);
    const suit = new THREE.Group();
    const suitM = mat(0x1e2b55, { metalness: 0.4, roughness: 0.4 }), suitAcc = mat(PALETTE.gold, { metalness: 0.7, roughness: 0.3 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 10), suitM); torso.position.y = 1.3; suit.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), suitM); head.position.y = 1.85; suit.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 8, -0.9, 1.8, 1.2, 0.5), glow(PALETTE.cyan, 2)); visor.position.y = 1.85; suit.add(visor);
    for (const sx of [-1, 1]) {
      const legM = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.6, 4, 8), suitM); legM.position.set(sx * 0.13, 0.55, 0); suit.add(legM);
      const armM = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 4, 8), suitM); armM.position.set(sx * 0.38, 1.25, 0); armM.rotation.z = sx * 0.15; suit.add(armM);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10), suitAcc); cuff.position.set(sx * 0.42, 0.98, 0); suit.add(cuff);
    }
    const chest = new THREE.Mesh(new THREE.CircleGeometry(0.11, 6), glow(PALETTE.red, 2)); chest.position.set(0, 1.42, 0.27); suit.add(chest);
    caseSite.add(suit, 0, 0.4, 0); spin(suit, 0.3);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: textTexture(['Prototype suit · v0.1'], { width: 512, height: 128, sizes: [48] }), transparent: true, depthWrite: false }));
    caseSite.add(sl, 0, 3.2, 0.2);
    caseSite.interact({ id: 'suit', name: 'Prototype suit', prompt: 'test the wrist launcher', action: { easter: 'web' }, station: null }, 0, 1, 1.4);
    ctx.refs.webTargets = tops;
    ctx.refs.suitCase = caseSite;
  }

  return ctx;
}

export { FONT_DISPLAY };

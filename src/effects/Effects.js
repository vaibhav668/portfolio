import * as THREE from 'three';
import { PALETTE } from '../world/helpers.js';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
  }

  confetti(at, count = 140) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), vel = [];
    const palette = [PALETTE.red, PALETTE.webBlue, PALETTE.gold, PALETTE.cyan, 0xffffff].map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const c = palette[i % palette.length]; col.set([c.r, c.g, c.b], i * 3);
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 6, 5 + Math.random() * 6, (Math.random() - 0.5) * 6));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true }));
    this.scene.add(pts);
    this.live.push({ life: 3, update: (dt, e) => {
      for (let i = 0; i < count; i++) {
        const v = vel[i]; v.y -= 9 * dt; v.multiplyScalar(0.985);
        pos[i * 3] += v.x * dt; pos[i * 3 + 1] += v.y * dt; pos[i * 3 + 2] += v.z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      pts.material.opacity = Math.min(1, e.life);
    }, dispose: () => { this.scene.remove(pts); geo.dispose(); pts.material.dispose(); } });
  }

  // A strand that shoots from `from` to `to`, sags, then fades.
  webLine(from, to) {
    const N = 24, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true }));
    this.scene.add(line);
    let t = 0;
    this.live.push({ life: 3.2, update: (dt, e) => {
      t += dt;
      const reach = Math.min(1, t * 3), sag = Math.max(0, t - 0.35) * 0.8;
      for (let i = 0; i < N; i++) {
        const u = (i / (N - 1)) * reach;
        const p = from.clone().lerp(to, u);
        p.y -= Math.sin((i / (N - 1)) * Math.PI) * sag * reach;
        pos.set([p.x, p.y, p.z], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      line.material.opacity = Math.min(1, e.life);
    }, dispose: () => { this.scene.remove(line); geo.dispose(); line.material.dispose(); } });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.life -= dt; e.update(dt, e);
      if (e.life <= 0) { e.dispose(); this.live.splice(i, 1); }
    }
  }
}

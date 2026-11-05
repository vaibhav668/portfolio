import { heightAt, insideIsland } from '../world/Terrain.js';

// Colliders are 2D (XZ) shapes: { type: 'circle', x, z, r } or { type: 'box', x, z, hw, hd, rot }.
// Surfaces are raised walkable areas (bridge, plazas) with a height `y`.
export class CollisionWorld {
  constructor() {
    this.colliders = [];
    this.dynamic = [];   // objects with a live { x, z, r } (e.g. the guide)
    this.surfaces = [];
  }

  addColliders(list) { this.colliders.push(...list); }
  addSurfaces(list) { this.surfaces.push(...list); }

  static local(s, x, z) {
    const dx = x - s.x, dz = z - s.z, c = Math.cos(-s.rot), n = Math.sin(-s.rot);
    return [dx * c + dz * n, -dx * n + dz * c];
  }

  surfaceContains(s, x, z) {
    if (s.type === 'circle') return (x - s.x) ** 2 + (z - s.z) ** 2 <= s.r * s.r;
    const [lx, lz] = CollisionWorld.local(s, x, z);
    return Math.abs(lx) <= s.hw && Math.abs(lz) <= s.hd;
  }

  surfaceY(s, x, z) {
    if (!s.sag) return s.y;
    const u = Math.min(1, Math.max(0, (z - s.sag.z0) / s.sag.len));
    return s.y - Math.sin(u * Math.PI) * s.sag.amt;
  }

  // Highest ground under (x, z) that the feet can step onto.
  groundAt(x, z, feetY = Infinity) {
    let g = insideIsland(x, z, 0.3) ? heightAt(x, z) : -Infinity;
    for (const s of this.surfaces) {
      if (!this.surfaceContains(s, x, z)) continue;
      const y = this.surfaceY(s, x, z);
      if (y <= feetY + 0.6 && y > g) g = y;
    }
    return g;
  }

  walkable(x, z) {
    if (insideIsland(x, z, 1.0)) return true;
    return this.surfaces.some((s) => this.surfaceContains(s, x, z));
  }

  // Push a circle of radius `r` out of every collider. Mutates pos {x, z}.
  resolve(pos, r) {
    const list = this.colliders;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < list.length; i++) this.pushOut(list[i], pos, r);
      for (const d of this.dynamic) this.pushOut({ type: 'circle', x: d.x, z: d.z, r: d.r }, pos, r);
    }
  }

  pushOut(c, pos, r) {
    if (c.type === 'circle') {
      const dx = pos.x - c.x, dz = pos.z - c.z, min = c.r + r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 === 0) return;
      const d = Math.sqrt(d2), k = (min - d) / d;
      pos.x += dx * k; pos.z += dz * k;
      return;
    }
    // quick reject
    const reach = Math.max(c.hw, c.hd) * 1.42 + r;
    if (Math.abs(pos.x - c.x) > reach || Math.abs(pos.z - c.z) > reach) return;
    const [lx, lz] = CollisionWorld.local(c, pos.x, pos.z);
    const cx = Math.max(-c.hw, Math.min(c.hw, lx)), cz = Math.max(-c.hd, Math.min(c.hd, lz));
    let dx = lx - cx, dz = lz - cz;
    const d2 = dx * dx + dz * dz;
    let nlx = lx, nlz = lz;
    if (d2 > 0) {
      if (d2 >= r * r) return;
      const d = Math.sqrt(d2), k = (r - d) / d;
      nlx += dx * k; nlz += dz * k;
    } else {
      // centre inside the box: exit through the nearest face
      const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz);
      if (ex < ez) nlx = Math.sign(lx || 1) * (c.hw + r); else nlz = Math.sign(lz || 1) * (c.hd + r);
    }
    const co = Math.cos(c.rot), sn = Math.sin(c.rot);
    pos.x = c.x + nlx * co + nlz * sn;
    pos.z = c.z - nlx * sn + nlz * co;
  }
}

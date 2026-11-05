import * as THREE from 'three';

// Each interactable: { id, name, prompt, position: Vector3, radius, action, station?, enabled?() }
export class InteractionManager {
  constructor() {
    this.items = new Map();
    this.current = null;
    this.onChange = () => {};
    this._dir = new THREE.Vector3();
  }

  register(item) {
    if (!item.id || !item.position) throw new Error('Interactable needs id and position');
    this.items.set(item.id, { radius: 3, ...item });
  }

  update(playerPos, camera) {
    camera.getWorldDirection(this._dir);
    let best = null, bestScore = Infinity;
    for (const it of this.items.values()) {
      if (it.enabled && !it.enabled()) continue;
      const dx = it.position.x - playerPos.x, dz = it.position.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d > it.radius || Math.abs(it.position.y - playerPos.y - 1) > 3.5) continue;
      // prefer what the visitor is looking at
      const facing = d > 0.01 ? (dx * this._dir.x + dz * this._dir.z) / d : 1;
      const score = d - facing * 1.2;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    if (best !== this.current) { this.current = best; this.onChange(best); }
    return best;
  }

  clear() { if (this.current) { this.current = null; this.onChange(null); } }
}

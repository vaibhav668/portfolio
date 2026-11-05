import * as THREE from 'three';

const EYE = 1.65, RADIUS = 0.4, WALK = 5.2, SPRINT = 9.5, JUMP = 6.4, GRAVITY = 19;

export class Player {
  constructor(camera, dom, physics, touch = null) {
    this.camera = camera;
    this.dom = dom;
    this.physics = physics;
    this.touch = touch;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.grounded = false;
    this.enabled = false;
    this.keys = new Set();
    this.bob = 0;
    this.sensitivity = 0.0022;
    this.locked = false;
    this.onLockChange = () => {};

    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      this.keys.add(e.code);
      if (e.code === 'Space' && this.enabled) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.look(e.movementX, e.movementY);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      this.onLockChange(this.locked);
    });
  }

  lock() {
    if (this.touch || this.locked) return;
    try {
      const p = this.dom.requestPointerLock?.();
      p?.catch?.(() => {});
    } catch { /* pointer lock unavailable: fall back to drag-look */ }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  look(dx, dy) {
    this.yaw -= dx * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * this.sensitivity, -1.45, 1.45);
  }

  teleport(x, z, yaw = this.yaw) {
    this.pos.set(x, this.physics.groundAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw; this.pitch = -0.05;
    this.applyCamera(0);
  }

  update(dt) {
    if (!this.enabled) return;
    const k = this.keys;
    let fx = 0, fz = 0, sprint = k.has('ShiftLeft') || k.has('ShiftRight'), jump = k.has('Space');
    if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
    if (this.touch) {
      const t = this.touch.state;
      fx += t.move.x; fz += t.move.y;
      sprint = sprint || Math.hypot(t.move.x, t.move.y) > 0.92;
      jump = jump || t.consumeJump();
      const l = t.consumeLook();
      this.look(l.x * 2.2, l.y * 2.2);
    }
    const len = Math.hypot(fx, fz);
    if (len > 1) { fx /= len; fz /= len; }

    const speed = sprint ? SPRINT : WALK;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const tx = (fx * cos - fz * sin) * speed, tz = (-fx * sin - fz * cos) * speed;
    const accel = this.grounded ? 12 : 3;
    const a = 1 - Math.exp(-accel * dt);
    this.vel.x += (tx - this.vel.x) * a;
    this.vel.z += (tz - this.vel.z) * a;

    if (jump && this.grounded) { this.vel.y = JUMP; this.grounded = false; this.onJump?.(); }
    this.vel.y -= GRAVITY * dt;

    // horizontal move with collision + edge checks (slide along walls and the rim)
    const p = this.physics, feet = this.pos.y;
    const next = { x: this.pos.x + this.vel.x * dt, z: this.pos.z + this.vel.z * dt };
    p.resolve(next, RADIUS);
    const ok = (x, z) => p.walkable(x, z) && p.groundAt(x, z, feet) > -Infinity && p.groundAt(x, z, feet) - feet < 0.65;
    if (ok(next.x, next.z)) { this.pos.x = next.x; this.pos.z = next.z; }
    else if (ok(next.x, this.pos.z)) { this.pos.x = next.x; this.vel.z = 0; }
    else if (ok(this.pos.x, next.z)) { this.pos.z = next.z; this.vel.x = 0; }
    else { this.vel.x = 0; this.vel.z = 0; }

    // vertical
    const wasGrounded = this.grounded, fallSpeed = this.vel.y;
    this.pos.y += this.vel.y * dt;
    const g = p.groundAt(this.pos.x, this.pos.z, feet);
    if (this.pos.y <= g + 0.02 && this.vel.y <= 0) {
      // snap down small steps so walking downhill stays grounded
      this.pos.y = g; this.vel.y = 0; this.grounded = true;
    } else if (this.grounded && this.vel.y <= 0 && this.pos.y - g < 0.45) {
      this.pos.y = g; this.vel.y = 0;
    } else {
      this.grounded = false;
    }
    if (!wasGrounded && this.grounded && fallSpeed < -3) this.onLand?.();
    if (this.pos.y < -30) this.onFall?.();

    const moving = this.grounded && Math.hypot(this.vel.x, this.vel.z) > 0.5;
    const step = Math.floor(this.bob / Math.PI);
    this.bob += dt * (moving ? Math.hypot(this.vel.x, this.vel.z) * 1.7 : 0);
    // one footstep per half bob cycle, so steps speed up when sprinting
    if (moving && Math.floor(this.bob / Math.PI) !== step) this.onStep?.(Math.hypot(this.vel.x, this.vel.z) / SPRINT);
    this.applyCamera(moving ? 1 : 0);
  }

  applyCamera(bobAmt) {
    this.camera.position.set(this.pos.x, this.pos.y + EYE + Math.sin(this.bob) * 0.045 * bobAmt, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}

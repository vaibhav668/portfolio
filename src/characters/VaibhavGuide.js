import * as THREE from 'three';
import { pathCurve, STATIONS } from '../world/layout.js';
import { heightAt } from '../world/Terrain.js';
import { mat, glow, holoMaterial, PALETTE } from '../world/helpers.js';

const capsule = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);

function buildBody() {
  const skin = mat(0xc98d66, { roughness: 0.7 });
  const hoodie = mat(0xc62f42, { roughness: 0.8 });
  const hoodieDark = mat(0x9e2333, { roughness: 0.8 });
  const pants = mat(0x1f2c52, { roughness: 0.85 });
  const shoe = mat(0xf2f4f8, { roughness: 0.6 });
  const sole = mat(0x2f5fd8);
  const hair = mat(0x1d1714, { roughness: 0.9, flatShading: true });
  const dark = mat(0x161b2b);

  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.95; root.add(body);
  const J = { root, body };

  // legs
  for (const side of [1, -1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.11, 0, 0); body.add(hip);
    const thigh = capsule(0.085, 0.32, pants); thigh.position.y = -0.22; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    const shin = capsule(0.075, 0.3, pants); shin.position.y = -0.2; knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.27), shoe); foot.position.set(0, -0.43, 0.05); knee.add(foot);
    const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.03, 0.275), sole); soleM.position.set(0, -0.475, 0.05); knee.add(soleM);
    J[side > 0 ? 'hipL' : 'hipR'] = hip; J[side > 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  // torso (hoodie)
  const torso = new THREE.Group(); body.add(torso); J.torso = torso;
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.16, 12), pants); pelvis.position.y = 0.02; torso.add(pelvis);
  const chest = capsule(0.2, 0.3, hoodie); chest.position.y = 0.33; chest.scale.set(1.05, 1, 0.78); torso.add(chest);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.06, 14), hoodieDark); band.position.y = 0.1; band.scale.z = 0.8; torso.add(band);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.01), mat(PALETTE.webBlue)); stripe.position.set(0, 0.36, 0.158); torso.add(stripe);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.32, 0.01), mat(0xe8ecf4)); zip.position.set(0, 0.3, 0.16); torso.add(zip);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 16), hoodieDark); hood.position.set(0, 0.56, -0.05); hood.rotation.x = Math.PI / 2.4; torso.add(hood);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.13), mat(0x1f2c52)); pack.position.set(0, 0.34, -0.2); torso.add(pack);
  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 0.135), glow(PALETTE.cyan, 1.5)); packStripe.position.set(0, 0.4, -0.2); torso.add(packStripe);

  // head
  const neck = new THREE.Group(); neck.position.y = 0.6; torso.add(neck); J.neck = neck;
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skin); neckM.position.y = 0.03; neck.add(neckM);
  const head = new THREE.Group(); head.position.y = 0.2; neck.add(head); J.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), skin); skull.scale.set(0.95, 1.08, 1); head.add(skull);
  for (const [x, y, z, s] of [[0, 0.1, -0.02, 0.15], [0.07, 0.12, 0.05, 0.08], [-0.07, 0.12, 0.05, 0.08], [0, 0.14, 0.07, 0.08], [0.11, 0.05, -0.03, 0.07], [-0.11, 0.05, -0.03, 0.07], [0, 0.05, -0.08, 0.12]]) {
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), hair); h.position.set(x, y, z); head.add(h);
  }
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dark); eye.position.set(sx * 0.052, 0.005, 0.136); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), hair); brow.position.set(sx * 0.052, 0.045, 0.14); brow.rotation.z = sx * -0.1; head.add(brow);
    const lensM = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), glow(PALETTE.cyan, 2)); lensM.position.set(sx * 0.052, 0.005, 0.148); head.add(lensM);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), skin); ear.position.set(sx * 0.145, 0, 0); ear.scale.z = 0.6; head.add(ear);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.006), glow(PALETTE.cyan, 2)); bridge.position.set(0, 0.01, 0.15); head.add(bridge);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skin); nose.position.set(0, -0.025, 0.148); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.01), mat(0x7a2f2f)); mouth.position.set(0, -0.065, 0.138); head.add(mouth); J.mouth = mouth;

  // arms
  for (const side of [1, -1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.27, 0.5, 0); torso.add(sh);
    const upper = capsule(0.065, 0.22, hoodie); upper.position.y = -0.15; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.31; sh.add(elbow);
    const fore = capsule(0.058, 0.2, hoodie); fore.position.y = -0.13; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin); hand.position.y = -0.3; hand.scale.set(0.9, 1.1, 0.7); elbow.add(hand);
    J[side > 0 ? 'shL' : 'shR'] = sh; J[side > 0 ? 'elL' : 'elR'] = elbow;
    if (side > 0) {
      // wrist device with a small hologram (left arm)
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 16), mat(0x222a40, { metalness: 0.6 })); band2.rotation.x = Math.PI / 2; band2.position.y = -0.23; elbow.add(band2);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.05), glow(PALETTE.cyan, 3)); face.position.set(0, -0.23, 0.065); face.rotation.x = Math.PI / 2; elbow.add(face);
      const holo = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4, 1, true), holoMaterial(PALETTE.cyan, 0.8)); holo.position.set(0, -0.23, 0.17); holo.rotation.x = -Math.PI / 2; elbow.add(holo); J.holo = holo;
    }
  }
  root.traverse((c) => { if (c.isMesh && !c.material.transparent) c.castShadow = true; });
  return J;
}

const ease = (cur, target, k) => cur + (target - cur) * k;

export class VaibhavGuide {
  constructor(scene, physics) {
    this.J = buildBody();
    this.root = this.J.root;
    this.root.scale.setScalar(1.06);
    scene.add(this.root);
    this.collider = { x: 0, z: 0, r: 0.45 };
    physics.dynamic.push(this.collider);
    this.interactPos = new THREE.Vector3();
    this.anim = 'idle';
    this.animT = 0;
    this.talking = false;
    this.walkPhase = 0;
    this.route = null;
    this.stationIndex = 0;
    this.facing = 0;
    this.waved = false;
    this.pointDir = null;
    this.placeAt(0);
  }

  // Where he waits at station i: beside the path spot, off the line between path and landmark.
  static standAt(i) {
    const s = STATIONS[i];
    if (i === 0) return [s.spot[0], s.spot[1]];
    const dx = s.site[0] - s.spot[0], dz = s.site[1] - s.spot[1], d = Math.hypot(dx, dz) || 1;
    return [s.spot[0] - (dz / d) * 2.4, s.spot[1] + (dx / d) * 2.4];
  }

  placeAt(i) {
    this.stationIndex = i;
    this.route = null;
    this.setPos(...VaibhavGuide.standAt(i));
    this.waved = false;
  }

  setPos(x, z) {
    this.root.position.set(x, heightAt(x, z), z);
    this.collider.x = x; this.collider.z = z;
    this.interactPos.set(x, this.root.position.y + 1.2, z);
  }

  get walking() { return !!this.route; }
  get station() { return STATIONS[this.stationIndex]; }

  // Walk along the path from the current station to station `i`.
  walkTo(i) {
    if (i === this.stationIndex || i >= STATIONS.length) return;
    const from = this.station.t, to = STATIONS[i].t;
    const pts = [];
    const n = Math.max(2, Math.ceil(Math.abs(to - from) * pathCurve.getLength() / 1.2));
    const tan = new THREE.Vector3();
    for (let k = 0; k <= n; k++) {
      const u = from + ((to - from) * k) / n;
      const p = pathCurve.getPointAt(u);
      pathCurve.getTangentAt(u, tan);
      pts.push(new THREE.Vector2(p.x + tan.z * 1.1 * Math.sign(to - from), p.z - tan.x * 1.1 * Math.sign(to - from)));
    }
    pts.push(new THREE.Vector2(...VaibhavGuide.standAt(i)));
    this.route = { pts, seg: 0, target: i };
    this.stationIndex = i;
    this.waved = false;
  }

  bodyHeadWorld(v) { return this.J.head.getWorldPosition(v); }

  // Face direction toward the path ahead (used while pointing).
  directionAhead() {
    const next = STATIONS[Math.min(this.stationIndex + 1, STATIONS.length - 1)];
    const u = Math.min(1, this.station.t + 0.03);
    const p = this.stationIndex === STATIONS.length - 1 ? new THREE.Vector3(next.site[0], 0, next.site[1]) : pathCurve.getPointAt(u);
    return Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
  }

  play(anim) { if (this.anim !== anim) { this.anim = anim; this.animT = 0; } }

  update(dt, t, playerPos) {
    const J = this.J;
    this.animT += dt;
    const pos = this.root.position;
    const dx = playerPos.x - pos.x, dz = playerPos.z - pos.z, dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    let targetYaw = this.facing;

    if (this.route) {
      const rt = this.route, p = rt.pts[rt.seg + 1];
      const end = rt.pts[rt.pts.length - 1];
      const playerAhead = Math.hypot(playerPos.x - end.x, playerPos.z - end.y) < Math.hypot(pos.x - end.x, pos.z - end.y);
      const waitForPlayer = dist > 22 && !playerAhead;
      if (!p) { this.route = null; this.play('point'); }
      else if (waitForPlayer) { this.play('idle'); targetYaw = toPlayer; }
      else {
        this.play('walk');
        const vx = p.x - pos.x, vz = p.y - pos.z, d = Math.hypot(vx, vz);
        const step = (dist > 12 ? 5.4 : 3.4) * dt;
        if (d <= step) { rt.seg++; this.setPos(p.x, p.y); }
        else { this.setPos(pos.x + (vx / d) * step, pos.z + (vz / d) * step); }
        targetYaw = Math.atan2(vx, vz);
        this.walkPhase += step * 3.2;
      }
    } else if (this.talking) {
      this.play('talk'); targetYaw = toPlayer;
    } else if (this.anim === 'point' && this.animT < 2.6) {
      targetYaw = this.directionAhead();
    } else if (dist < 7 && !this.waved) {
      this.waved = true; this.play('wave');
    } else if (this.anim === 'wave' && this.animT < 2.2) {
      targetYaw = toPlayer;
    } else {
      this.play('idle');
      targetYaw = dist < 14 ? toPlayer : this.directionAhead();
    }

    // smooth turn
    let dy = targetYaw - this.facing;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.facing += dy * (1 - Math.exp(-6 * dt));
    this.root.rotation.y = this.facing;

    // ----- pose -----
    const k = 1 - Math.exp(-10 * dt);
    const pose = { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shLx: 0, shLz: 0.12, shRx: 0, shRz: -0.12, elL: -0.15, elR: -0.15, elRz: 0, headX: 0, headY: 0, bodyY: 0.95, torsoZ: 0, mouth: 1 };
    const breathe = Math.sin(t * 2) * 0.01;
    switch (this.anim) {
      case 'walk': {
        const s = Math.sin(this.walkPhase);
        pose.hipL = s * 0.6; pose.hipR = -s * 0.6;
        pose.kneeL = Math.max(0, -Math.cos(this.walkPhase)) * 0.8; pose.kneeR = Math.max(0, Math.cos(this.walkPhase)) * 0.8;
        pose.shLx = -s * 0.5; pose.shRx = s * 0.5; pose.elL = -0.4; pose.elR = -0.4;
        pose.bodyY = 0.95 + Math.abs(Math.cos(this.walkPhase)) * 0.04;
        break;
      }
      case 'wave':
        pose.shRz = -2.55; pose.shRx = -0.2; pose.elRz = Math.sin(this.animT * 10) * 0.45; pose.elR = -0.2; pose.headX = -0.05;
        break;
      case 'point':
        pose.shRx = -1.45; pose.shRz = -0.1; pose.elR = 0; pose.headY = 0;
        break;
      case 'talk':
        pose.shRx = -0.55 + Math.sin(t * 3.1) * 0.25; pose.elR = -1.0 + Math.sin(t * 4.3) * 0.3;
        pose.shLx = -0.35 + Math.sin(t * 2.3 + 1) * 0.2; pose.elL = -0.9;
        pose.headX = Math.sin(t * 5.5) * 0.06; pose.headY = Math.sin(t * 1.3) * 0.1;
        pose.mouth = 1 + Math.abs(Math.sin(t * 14)) * 3;
        break;
      default: {
        // idle: breathe, glance around, check the wrist device now and then
        const glance = Math.sin(t * 0.45) * 0.5;
        pose.headY = glance; pose.torsoZ = Math.sin(t * 0.8) * 0.02;
        const checking = Math.sin(t * 0.21) > 0.75;
        if (checking) { pose.shLx = -0.9; pose.elL = -1.6; pose.headX = 0.35; pose.headY = 0.25; }
      }
    }
    J.hipL.rotation.x = ease(J.hipL.rotation.x, pose.hipL, k);
    J.hipR.rotation.x = ease(J.hipR.rotation.x, pose.hipR, k);
    J.kneeL.rotation.x = ease(J.kneeL.rotation.x, pose.kneeL, k);
    J.kneeR.rotation.x = ease(J.kneeR.rotation.x, pose.kneeR, k);
    J.shL.rotation.x = ease(J.shL.rotation.x, pose.shLx, k); J.shL.rotation.z = ease(J.shL.rotation.z, pose.shLz, k);
    J.shR.rotation.x = ease(J.shR.rotation.x, pose.shRx, k); J.shR.rotation.z = ease(J.shR.rotation.z, pose.shRz, k);
    J.elL.rotation.x = ease(J.elL.rotation.x, pose.elL, k);
    J.elR.rotation.x = ease(J.elR.rotation.x, pose.elR, k); J.elR.rotation.z = ease(J.elR.rotation.z, pose.elRz, k);
    J.head.rotation.x = ease(J.head.rotation.x, pose.headX, k); J.head.rotation.y = ease(J.head.rotation.y, pose.headY, k);
    J.torso.rotation.z = ease(J.torso.rotation.z, pose.torsoZ, k);
    J.torso.scale.y = 1 + breathe;
    J.body.position.y = ease(J.body.position.y, pose.bodyY, k);
    J.mouth.scale.y = pose.mouth;
    J.holo.rotation.y = t * 2; J.holo.material.uniforms.uOpacity.value = 0.5 + Math.sin(t * 6) * 0.2;
  }
}

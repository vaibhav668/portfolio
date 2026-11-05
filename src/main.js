import * as THREE from 'three';
import './styles/main.css';
import { buildHeightField, buildIsland } from './world/Terrain.js';
import { buildEnvironment } from './world/Environment.js';
import { buildLandmarks } from './world/Landmarks.js';
import { holoTime } from './world/helpers.js';
import { STATIONS, SPAWN, pathCurve } from './world/layout.js';
import { CollisionWorld } from './player/Collision.js';
import { Player } from './player/Player.js';
import { TouchControls } from './player/TouchControls.js';
import { VaibhavGuide } from './characters/VaibhavGuide.js';
import { InteractionManager } from './interaction/InteractionManager.js';
import { UI } from './ui/UI.js';
import { Effects } from './effects/Effects.js';
import { SECTIONS, GUIDE_LINES } from './portfolio/PortfolioUI.js';
import { sound } from './audio/Sound.js';

// ---------------------------------------------------------------- capability & quality
const uiRoot = document.getElementById('ui');
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!webglOK()) {
  uiRoot.innerHTML = `<div class="nowebgl"><h1>Your browser can’t show the 3D island</h1>
    <p>WebGL is turned off or unsupported on this device. The full portfolio is still here.</p>
    <p><a class="btn btn-solid" href="classic/index.html">Open the classic portfolio</a></p></div>`;
  throw new Error('WebGL unavailable');
}

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const lowMem = (navigator.deviceMemory || 8) <= 4;
const TIERS = [
  { name: 'low', dpr: 1, shadows: false, shadowSize: 1024, grass: 2500, trees: 55, particles: 120 },
  { name: 'medium', dpr: 1.4, shadows: true, shadowSize: 1024, grass: 7000, trees: 75, particles: 220 },
  { name: 'high', dpr: 1.75, shadows: true, shadowSize: 2048, grass: 16000, trees: 90, particles: 380 },
];
let tier = isTouch ? (lowMem ? 0 : 1) : 2;
if (new URLSearchParams(location.search).has('lite')) tier = 0;
const quality = { ...TIERS[tier], isMobile: isTouch };

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.dpr));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = quality.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'scene';
renderer.domElement.setAttribute('aria-label', 'Interactive 3D island portfolio');
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(160, 80, -40);
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------- state
const state = {
  mode: 'loading',          // loading | intro | play | map | browse
  visited: new Set(),
  visorAnnounced: false,
  contactAnnounced: false,
  cinematic: null,
};

const physics = new CollisionWorld();
const interactions = new InteractionManager();
const effects = new Effects(scene);
let touch = null, player, guide, env, island, landmarks;

const ui = new UI(uiRoot, {
  startExploration: () => { sound.start(); startPlay(); },
  browse: () => { sound.start(); startBrowse(); },
  skipIntro: () => finishCinematic(),
  toggleMap: () => toggleMap(),
  openSection: (s, item) => openSection(s, item),
  closeOverlay: () => closeOverlays(true),
  walkTo: (i) => walkTo(i),
  restart: () => restart(),
  resume: () => resume(),
  menuOpened: () => { if (state.mode === 'play' && !isTouch) player.unlock(); },
}, { touch: isTouch });

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------------------------------------------------------- init
async function init() {
  ui.setLoading(0.05, 'Loading fonts');
  await Promise.race([
    Promise.all(['700 64px "Chakra Petch"', '500 40px "Chakra Petch"', '500 24px "IBM Plex Mono"'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  ui.setLoading(0.15, 'Shaping the island'); await frame();
  buildHeightField();
  ui.setLoading(0.35, 'Painting the path'); await frame();
  island = buildIsland(); scene.add(island.group);
  ui.setLoading(0.55, 'Growing trees and grass'); await frame();
  env = buildEnvironment(scene, quality);
  physics.addColliders(env.colliders);
  ui.setLoading(0.72, 'Building landmarks'); await frame();
  landmarks = buildLandmarks(scene);
  physics.addColliders(landmarks.colliders);
  physics.addSurfaces(landmarks.surfaces);
  ui.setLoading(0.86, 'Waking up Vaibhav'); await frame();

  if (isTouch) touch = new TouchControls(uiRoot, () => interact());
  player = new Player(camera, renderer.domElement, physics, touch?.state ? touch : null);
  player.onFall = () => player.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  player.onStep = (speed) => sound.step(speed);
  player.onJump = () => sound.jump();
  player.onLand = () => sound.land();
  player.onLockChange = (locked) => {
    if (!locked && state.mode === 'play' && !anyOverlay()) ui.showPause(true);
    if (locked) ui.showPause(false);
  };
  guide = new VaibhavGuide(scene, physics);

  for (const it of landmarks.interactables) interactions.register(it);
  interactions.register({
    id: 'guide', name: 'Vaibhav', prompt: 'talk to Vaibhav', position: guide.interactPos, radius: 3.4,
    action: { guide: true }, enabled: () => !guide.walking,
  });
  interactions.onChange = (it) => { ui.setPrompt(it); touch?.setUse(it ? 'Use' : null); };

  ui.setLoading(1, 'Ready');
  renderer.compile(scene, camera);
  await frame();
  ui.hideLoading();
  startCinematic();
}

// ---------------------------------------------------------------- cinematic intro
const camPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(160, 80, -40), new THREE.Vector3(95, 52, -120), new THREE.Vector3(-50, 40, -125),
  new THREE.Vector3(-125, 30, -10), new THREE.Vector3(-85, 20, 85), new THREE.Vector3(-10, 10, 104), new THREE.Vector3(18, 7, 84), new THREE.Vector3(11.5, 4.8, 67),
]);
const lookFinal = new THREE.Vector3(-2, 2.2, 46);
const _look = new THREE.Vector3();

function startCinematic() {
  state.mode = 'intro';
  state.cinematic = { t: 0, dur: 13 };
  ui.showIntro();
}
function cinematicCamera(u, t) {
  const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
  camera.position.copy(camPath.getPointAt(e));
  _look.set(0, 2, 0).lerp(lookFinal, THREE.MathUtils.smoothstep(e, 0.62, 1));
  if (u >= 1) { camera.position.x += Math.sin(t * 0.3) * 0.4; camera.position.y += Math.sin(t * 0.5) * 0.15; }
  camera.lookAt(_look);
}
function finishCinematic() {
  if (!state.cinematic) return;
  state.cinematic.t = state.cinematic.dur;
  ui.revealTitle();
}

// ---------------------------------------------------------------- modes
function startPlay(at = null) {
  ui.hideIntro();
  state.cinematic = null;
  closeOverlays(false);
  ui.closeMap();
  state.mode = 'play';
  if (at) player.teleport(at.x, at.z, at.yaw);
  else if (!player.pos.lengthSq()) player.teleport(SPAWN.x, SPAWN.z, SPAWN.yaw);
  else player.applyCamera(0);
  player.enabled = true;
  ui.showHUD(true);
  touch?.setVisible(true);
  updateObjective();
  if (!state.visited.has(0)) ui.toast('Welcome to the island', 'Cross the bridge and say hi to Vaibhav');
  player.lock();
}
function startBrowse() {
  ui.hideIntro();
  state.cinematic = null;
  state.mode = 'browse';
  ui.showHUD(true);
  document.body.classList.add('browsing');
  ui.openMap();
  openSection('about');
}
function resume() {
  ui.showPause(false);
  if (state.mode === 'play') { closeOverlays(false); player.enabled = true; player.lock(); }
}
function restart() {
  closeOverlays(false);
  state.visited.clear();
  state.visorAnnounced = state.contactAnnounced = false;
  guide.placeAt(0);
  player.pos.set(0, 0, 0);
  startPlay({ x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw });
}
function walkTo(i) {
  const s = STATIONS[i];
  const dx = s.site[0] - s.spot[0], dz = s.site[1] - s.spot[1];
  startPlay({ x: s.spot[0] - dx * 0.25, z: s.spot[1] - dz * 0.25, yaw: Math.atan2(-dx, -dz) });
}

let mapCam = 0;
function toggleMap() {
  if (state.mode === 'map') { ui.closeMap(); startPlay(); return; }
  if (state.mode === 'browse') { ui.mapOpen ? ui.closeMap() : ui.openMap(); return; }
  if (state.mode !== 'play') return;
  closeOverlays(false);
  ui.showPause(false);
  player.enabled = false; player.unlock();
  state.mode = 'map'; mapCam = 0;
  sound.whoosh();
  ui.setPrompt(null);
  ui.openMap();
}

// ---------------------------------------------------------------- overlays & sections
const anyOverlay = () => ui.panelOpen || ui.visorOpen || ui.dialogueOpen;

function openSection(section, item) {
  if (section === 'github') { window.open('https://github.com/vaibhav668', '_blank', 'noopener'); return; }
  ui.closeDialogue();
  ui.toggleMenu(false);
  ui.showPause(false);
  if (state.mode === 'play') { player.enabled = false; player.unlock(); }
  if (section === 'visor') { ui.closePanel(); ui.openVisor(); }
  else { ui.closeVisor(); ui.openPanel(section, item); }
  sound.open();
  const sec = SECTIONS.find((s) => s.id === section);
  if (sec && state.mode === 'play') visit(sec.station);
  if (section === 'achievements' && state.mode === 'play') {
    const site = landmarks.refs.trophySite;
    effects.confetti(new THREE.Vector3(site.x, site.y + 3, site.z));
    sound.sparkle();
  }
}

function closeOverlays(resumePlay) {
  const had = anyOverlay();
  if (ui.panelOpen || ui.visorOpen) sound.close();
  ui.closePanel(); ui.closeVisor(); ui.closeDialogue();
  guide && (guide.talking = false);
  if (resumePlay && had && state.mode === 'play') {
    player.enabled = true;
    if (!isTouch) { player.lock(); setTimeout(() => { if (!player.locked && state.mode === 'play' && !anyOverlay()) ui.showPause(true); }, 150); }
  }
}

function visit(i) {
  if (i == null) return;
  const first = !state.visited.has(i);
  state.visited.add(i);
  updateObjective();
  if (state.visited.size === STATIONS.length && first) {
    sound.fanfare();
    ui.toast('Journey complete', 'You’ve seen every corner of the island. Thanks for visiting.', 5000);
  }
}

// The guide always heads one stop past the furthest place the visitor has reached.
function steerGuide() {
  if (!state.visited.size || guide.talking) return;
  const target = Math.min(STATIONS.length - 1, Math.max(...state.visited) + 1);
  const far = Math.hypot(player.pos.x - guide.root.position.x, player.pos.z - guide.root.position.z) > 45;
  // visitor jumped ahead (map, menu): meet them there instead of trekking across the island
  if ((far || state.mode !== 'play') && (guide.stationIndex < target || guide.walking)) {
    if (guide.stationIndex !== target || guide.walking) guide.placeAt(target);
    return;
  }
  if (!guide.walking && guide.stationIndex < target) guide.walkTo(target);
}

function updateObjective() {
  const next = STATIONS.find((s) => !state.visited.has(s.index));
  const text = !state.visited.has(0) ? 'Talk to Vaibhav at the entrance'
    : next ? `Next stop: ${next.name}` : 'Journey complete. Explore freely.';
  ui.setObjective(text, state.visited);
}

function guideDialogue() {
  guide.talking = true;
  player.enabled = false; player.unlock();
  if (!state.visited.has(0)) {
    ui.openDialogue(GUIDE_LINES.intro, [
      { label: 'Begin the journey', action: () => { closeOverlays(true); visit(0); ui.toast('Journey started', 'Follow Vaibhav along the stone path'); } },
      { label: 'Show me the map', action: () => { closeOverlays(false); visit(0); state.mode = 'play'; toggleMap(); } },
      { label: 'Just browse sections', action: () => { visit(0); openSection('visor'); } },
    ]);
    return;
  }
  const st = guide.station;
  const line = GUIDE_LINES[st.id] || GUIDE_LINES.contact;
  const sec = SECTIONS.find((s) => s.id === st.section);
  ui.openDialogue([line], [
    { label: `Show me ${sec.label.toLowerCase()}`, action: () => openSection(st.section) },
    { label: 'Keep exploring', action: () => closeOverlays(true) },
  ]);
}

function interact() {
  if (ui.dialogueOpen) { ui.advanceDialogue(); return; }
  if (anyOverlay() || state.mode !== 'play') return;
  const it = interactions.current;
  if (!it) return;
  sound.interact();
  const a = it.action;
  if (a.guide) return guideDialogue();
  if (a.easter === 'web') {
    const from = camera.position.clone().add(new THREE.Vector3(0.3, -0.3, 0).applyQuaternion(camera.quaternion));
    const targets = landmarks.refs.webTargets;
    effects.webLine(from, targets[Math.floor(Math.random() * targets.length)]);
    ui.toast('Wrist launcher: test fired', 'Prototype v0.1. Still debugging the landing.');
    return;
  }
  if (a.section) openSection(a.section, a.item);
}

// ---------------------------------------------------------------- input
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.code !== 'Escape') return;
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyN') sound.toggle();
  if (e.code === 'KeyM' && ['play', 'map', 'browse'].includes(state.mode) && !ui.visorOpen) toggleMap();
  if (e.code === 'Escape') {
    if (ui.menuOpen) ui.toggleMenu(false);
    else if (anyOverlay()) closeOverlays(true);
    else if (state.mode === 'map') toggleMap();
  }
  if ((e.code === 'Enter' || e.code === 'Space') && state.mode === 'intro' && state.cinematic && state.cinematic.t < state.cinematic.dur) finishCinematic();
});
renderer.domElement.addEventListener('click', () => {
  if (ui.menuOpen) ui.toggleMenu(false);
  if (state.mode === 'play' && !anyOverlay()) { ui.showPause(false); player.enabled = true; player.lock(); }
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- per-frame helpers
const _v = new THREE.Vector3();
function toScreen(v) {
  _v.copy(v).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, visible: _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1 };
}

function updateBubble() {
  if (state.mode !== 'play' || anyOverlay()) return ui.setBubble(null);
  const d = Math.hypot(player.pos.x - guide.root.position.x, player.pos.z - guide.root.position.z);
  let text = null;
  if (guide.walking && d < 16) text = 'Follow me!';
  else if (!guide.walking && d < 12) {
    if (!state.visited.has(0)) text = isTouch ? 'Hey! Tap Use to talk to me.' : 'Hey! Press E to talk to me.';
    else if (!state.visited.has(guide.stationIndex)) text = GUIDE_LINES[guide.station.id];
  }
  if (!text) return ui.setBubble(null);
  guide.bodyHeadWorld(_v); _v.y += 0.55;
  const p = toScreen(_v);
  ui.setBubble(p.visible ? text : null, p.x, p.y);
}

function proximityEvents() {
  const near = (i, r) => Math.hypot(player.pos.x - STATIONS[i].site[0], player.pos.z - STATIONS[i].site[1]) < r;
  if (!state.visorAnnounced && near(6, 14)) { state.visorAnnounced = true; ui.toast('VISOR system online', 'Portfolio interface initialized. Step onto the platform to access it.', 4500); }
  if (!state.contactAnnounced && near(7, 12)) { state.contactAnnounced = true; ui.toast('Signal found', 'The Comm Tower has every way to reach Vaibhav'); }
}

// adaptive quality: step down if frames are slow for a while
let perfAcc = 0, perfFrames = 0;
function watchPerf(dt) {
  if (state.mode !== 'play') return;
  perfAcc += dt; perfFrames++;
  if (perfAcc < 4) return;
  const fps = perfFrames / perfAcc; perfAcc = 0; perfFrames = 0;
  if (fps < 32 && tier > 0) {
    tier--;
    const q = TIERS[tier];
    renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr));
    if (!q.shadows) { renderer.shadowMap.enabled = false; env.setShadows(false); scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (state.mode === 'loading') return;
  holoTime.value = t;
  env.update(t);
  island.update(t);
  for (const f of landmarks.update) f(t);
  effects.update(dt);

  if (state.mode === 'intro' && state.cinematic) {
    const c = state.cinematic;
    c.t = Math.min(c.dur, c.t + dt);
    cinematicCamera(c.t / c.dur, t);
    if (c.t / c.dur > 0.8 && !ui.introEl.classList.contains('reveal')) ui.revealTitle();
  } else if (state.mode === 'map' || state.mode === 'browse') {
    mapCam += dt;
    const k = Math.min(1, mapCam / 1.4), e = k * k * (3 - 2 * k);
    const target = _v.set(0, 118, 62); // fixed view so markers hold still for clicking
    camera.position.lerp(target, 1 - Math.exp(-dt * (2 + e * 4)));
    if (camera.position.distanceTo(target) < 0.05) camera.position.copy(target);
    camera.lookAt(0, -4, -4);
    if (ui.mapOpen) ui.placeMarkers((s) => toScreen(new THREE.Vector3(s.site[0], 9, s.site[1])));
  } else if (state.mode === 'play') {
    player.update(dt);
    if (!anyOverlay()) {
      interactions.update(player.pos, camera);
      proximityEvents();
    } else interactions.clear();
  }
  if (guide) { steerGuide(); guide.update(dt, t, player?.pos || camera.position); }
  if (state.mode === 'play' || state.mode === 'intro') updateBubble();
  if (state.mode !== 'play') ui.setBubble(null);
  touch?.setVisible(state.mode === 'play' && !anyOverlay() && !ui.menuOpen);
  watchPerf(dt);
  renderer.render(scene, camera);
}

init().then(loop).catch((err) => {
  console.error(err);
  uiRoot.innerHTML = `<div class="nowebgl"><h1>The island failed to load</h1><p>${String(err.message || err)}</p>
    <p><a class="btn btn-solid" href="classic/index.html">Open the classic portfolio</a></p></div>`;
});

// expose for debugging and automated checks
window.__island = { pathPoints: () => [[0, 86], [0, 72], [0, 61], ...pathCurve.getSpacedPoints(160).map((p) => [p.x, p.z])], scene, renderer, state, get player() { return player; }, get guide() { return guide; }, physics, interactions, ui, openSection, startPlay, toggleMap, walkTo, interact, camera };

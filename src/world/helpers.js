import * as THREE from 'three';

export const PALETTE = {
  cyan: 0x4fe3ff,
  cyanDeep: 0x1fa8d6,
  red: 0xe5394f,
  webBlue: 0x2f5fd8,
  navy: 0x16224a,
  gold: 0xf2b33d,
  white: 0xf4f9ff,
  stone: 0xd9d2c3,
  stoneDark: 0x8d8a96,
  metal: 0xc9d3e0,
};

// ---------- noise ----------
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * valueNoise(x * f, y * f); f *= 2; a *= 0.5; }
  return s;
}
// Deterministic RNG so the island looks the same on every visit.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------- materials ----------
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts }));
  return matCache.get(key);
}
export function glow(color, intensity = 2) {
  return mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

// Animated hologram: fresnel rim + scan lines. All instances share one time uniform.
export const holoTime = { value: 0 };
export function holoMaterial(color = PALETTE.cyan, opacity = 0.55, map = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: holoTime,
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vY = wp.y;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
      uniform sampler2D uMap; uniform float uHasMap;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), vV)), 2.0);
        float scan = 0.75 + 0.25 * sin(vY * 40.0 - uTime * 4.0);
        float flick = 0.92 + 0.08 * sin(uTime * 23.0);
        vec3 col = uColor;
        float a = (0.25 + fres * 0.9) * scan;
        if (uHasMap > 0.5) {
          vec4 t = texture2D(uMap, vUv);
          col = mix(uColor, t.rgb, 0.85);
          a = max(a * 0.4, t.a) * scan;
        }
        gl_FragColor = vec4(col * 1.6, a * uOpacity * flick);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

// ---------- text ----------
export const FONT_DISPLAY = '"Chakra Petch", "Segoe UI", system-ui, sans-serif';

export function textTexture(lines, { width = 1024, height = 256, color = '#e8fbff', glowColor = '#4fe3ff', bg = null, align = 'center', sizes = [96], glow = 0.2 } = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    roundRect(g, 6, 6, width - 12, height - 12, 28); g.fill();
    g.strokeStyle = glowColor; g.lineWidth = 4; g.stroke();
  }
  const list = Array.isArray(lines) ? lines : [lines];
  const total = list.reduce((s, _, i) => s + (sizes[i] ?? sizes[sizes.length - 1]) * 1.2, 0);
  let y = (height - total) / 2;
  g.textAlign = align; g.textBaseline = 'top';
  list.forEach((line, i) => {
    const size = sizes[i] ?? sizes[sizes.length - 1];
    g.font = `${i === 0 ? 700 : 500} ${size}px ${FONT_DISPLAY}`;
    g.shadowColor = glowColor; g.shadowBlur = size * glow;
    g.fillStyle = color;
    g.fillText(line, align === 'center' ? width / 2 : 40, y + size * 0.1);
    y += size * 1.2;
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Floating station name badge (always faces the camera).
export function labelSprite(text, sub = '', scale = 1) {
  const tex = textTexture(sub ? [text, sub] : [text], {
    width: 1024, height: sub ? 300 : 200, sizes: sub ? [96, 58] : [96], bg: 'rgba(9,22,44,0.92)', color: '#ffffff', glow: 0.06,
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  const h = (sub ? 300 : 200) / 1024;
  sp.scale.set(6.4 * scale, 6.4 * h * scale, 1);
  sp.renderOrder = 5;
  return sp;
}

// Hologram plane with text or an image.
// Text panels are solid and one-sided so they stay readable: a see-through,
// double-sided, additive panel lets the mirrored back face bleed through the text.
// Pass { solid: false } for decorative glyphs that should keep the hologram look.
export function holoPanel(w, h, map, color = PALETTE.cyan, opacity = 0.9, { solid = true } = {}) {
  const material = map && solid
    ? new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: THREE.FrontSide })
    : holoMaterial(color, opacity, map);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
}

// Signboard texture: dark plate, bright text, thin outline.
export function signTexture(lines, opts = {}) {
  return textTexture(lines, { bg: 'rgba(9, 22, 44, 0.92)', color: '#ffffff', glow: 0.08, ...opts });
}

export const loader = new THREE.TextureLoader();
export function loadTex(url) {
  const t = loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

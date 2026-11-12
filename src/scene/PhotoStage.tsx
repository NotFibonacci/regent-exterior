import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { startTimeline, state } from './timeline';

// The hero is a real photograph, relit in the browser. The daytime photo
// holds all the surface detail; the shader grades it down to dusk and night,
// then "switches on" fixtures by letting warm light reveal the day pixels.
// Everything is placed in image coordinates: x and y as percentages of the
// photo, origin top-left.

const IMG_ASPECT = 4 / 3;
const N = 24;
const G = { path: 0, uplight: 1, wash: 2, eave: 3, holiday: 4, entry: 5 } as const;

type Fx = { at: [number, number]; dir?: [number, number]; deg?: number; reach: number; squash?: number; power: number; group: number };
const up: [number, number] = [0, -1];
const down: [number, number] = [0, 1];

// The scheme follows how a lighting designer would treat this house: light
// the features, leave the rest dark. Corners and piers are grazed, never the
// middle of a wall under a window; one specimen plant is picked out; the
// entry is the warmest point; a tree behind the roof gives depth.
const FIXTURES: Fx[] = [
  // Path: few, staggered either side of the walk, never a runway.
  { at: [14, 90.5], reach: 0.08, squash: 3.2, power: 1.25, group: G.path },
  { at: [28, 86.2], reach: 0.08, squash: 3.2, power: 1.25, group: G.path },
  { at: [40, 87.2], reach: 0.08, squash: 3.2, power: 1.25, group: G.path },
  { at: [57, 87.2], reach: 0.08, squash: 3.2, power: 1.25, group: G.path },
  { at: [70, 91.2], reach: 0.08, squash: 3.2, power: 1.25, group: G.path },
  // Stone: grazers at the two piers of the front gable and beside the door.
  { at: [54.6, 82.6], dir: [0.02, -1], deg: 21, reach: 0.34, power: 4.6, group: G.uplight },
  { at: [75.2, 86.2], dir: [-0.02, -1], deg: 21, reach: 0.37, power: 4.6, group: G.uplight },
  { at: [43.5, 79.2], dir: up, deg: 15, reach: 0.38, power: 4.2, group: G.uplight },
  // The clipped tree by the steps, lit as a specimen.
  { at: [53.2, 77.5], dir: up, deg: 40, reach: 0.17, power: 3.0, group: G.uplight },
  // The corner, so the house reads as a volume and not a flat front.
  { at: [80.6, 87.4], dir: [0.04, -1], deg: 17, reach: 0.44, power: 3.4, group: G.uplight },
  // Siding: one soft wash between the wing windows, the big shrub, and a
  // downlight tucked under the gable peak.
  { at: [26.2, 79.5], dir: up, deg: 44, reach: 0.25, power: 3.0, group: G.wash },
  { at: [19, 80], dir: [0.1, -1], deg: 60, reach: 0.14, power: 1.6, group: G.wash },
  { at: [61.0, 23.2], dir: down, deg: 36, reach: 0.33, power: 3.2, group: G.wash },
  // Roofline: soffit light under the wing eave and over the door.
  { at: [23.5, 58.2], dir: down, deg: 50, reach: 0.17, power: 2.2, group: G.eave },
  { at: [29.5, 57.6], dir: down, deg: 50, reach: 0.17, power: 2.2, group: G.eave },
  { at: [46.2, 57.0], dir: down, deg: 44, reach: 0.27, power: 2.8, group: G.eave },
  // The lantern by the door comes up with nightfall.
  { at: [49.3, 61.2], reach: 0.07, power: 1.0, group: G.entry },
];

// Windows that glow from inside at night (centre x, y and half size, image %).
const WINDOWS: [number, number, number, number][] = [
  [61.1, 37.6, 2.5, 4.6],
  [47.0, 44.6, 1.1, 3.6],
  [23.8, 64.2, 1.1, 3.3],
  [28.5, 64.4, 1.2, 3.8],
];

// Shrubs that take net lights in the holiday state (centre and radii, image %).
const NETS: { c: [number, number]; r: [number, number]; n: number }[] = [
  { c: [19.5, 74.5], r: [9.6, 6.6], n: 190 },
  { c: [53.2, 66.8], r: [4.4, 6.2], n: 90 },
];

// Rooflines that carry holiday string lights.
// Traced on the photo along the outer roof edge, so every run is dead
// straight on the real line of the house.
const STRINGS: [number, number][][] = [
  [[19.7, 56.9], [33.1, 55.1]],
  [[33.9, 54.6], [42.7, 43.0]],
  [[44.8, 38.1], [47.5, 33.2], [50.3, 36.3]],
  [[50.6, 39.6], [61.0, 19.6], [74.3, 32.3]],
  [[75.4, 31.7], [82.4, 14.6], [89.4, 48.3]],
  [[51.0, 54.6], [74.4, 52.3]],
];

// View per scene section: centre of interest (image %) and zoom.
const KEYS = [
  { c: [50, 52], z: 0.8 },
  { c: [42, 68], z: 1.12 },
  { c: [60, 64], z: 1.28 },
  { c: [57, 44], z: 1.12 },
  { c: [50, 51], z: 0.8 },
];

const vertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
#define N ${N}
#define S 12
#define W 4
uniform sampler2D tDay;
uniform sampler2D tSky;
uniform sampler2D tDraw;
uniform vec2 uTexel;
uniform vec2 uC;      // view centre, image uv
uniform float uZ;     // zoom
uniform vec2 uF;      // fraction of the image visible at zoom 1
uniform vec2 uFrame;  // x: share of screen height the photo fills, y: shift right
uniform float uNight;
uniform float uHoliday;
uniform float uIntro;
uniform vec2 uLP[N];
uniform vec2 uLD[N];
uniform vec3 uLA[N];  // cos of cone half-angle (-1 = all round), reach, vertical squash
uniform float uLI[N];
uniform vec2 uCur;
uniform float uCurInt;
uniform vec4 uSeg[S];
uniform vec4 uWin[W];
uniform float uWinI;
varying vec2 vUv;

const vec3 WARM = vec3(1.0, 0.60, 0.29);
const vec3 INK = vec3(0.0024, 0.0027, 0.0034);
const float A = ${IMG_ASPECT.toFixed(5)};

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 day(vec2 uv) { return texture2D(tDay, vec2(uv.x, 1.0 - uv.y)).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float segDist(vec2 p, vec4 s) {
  vec2 pa = p - s.xy, ba = s.zw - s.xy;
  return length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
}

void main() {
  float yt = (1.0 - vUv.y) / uFrame.x;
  vec2 uv = uC + (vec2(vUv.x - uFrame.y, yt) - 0.5) * uF / uZ;
  vec2 cuv = clamp(uv, 0.0, 1.0);

  vec3 d = day(cuv);
  float L0 = luma(d);
  float sky = texture2D(tSky, vec2(cuv.x, 1.0 - cuv.y)).r;

  // Surface relief, read from the photo itself: the brightness gradient
  // stands in for a normal, so a moving light rakes across stone and laps.
  vec2 e = uTexel * 1.5;
  vec2 grad = vec2(luma(day(cuv + vec2(e.x, 0.0))) - luma(day(cuv - vec2(e.x, 0.0))),
                   luma(day(cuv + vec2(0.0, e.y))) - luma(day(cuv - vec2(0.0, e.y))));

  // Dusk and night grades of the same pixels.
  vec3 cool = mix(vec3(L0), d, 0.5);
  vec3 groundDusk = mix(vec3(L0), d, 0.85) * vec3(0.50, 0.55, 0.74) * 0.60;
  vec3 groundNight = cool * vec3(0.26, 0.36, 0.66) * 0.085;
  vec3 skyDusk = d * vec3(0.34, 0.37, 0.62) * 0.8 + vec3(0.42, 0.17, 0.05) * smoothstep(0.2, 0.62, cuv.y) * 0.5;
  vec3 skyNight = pow(L0, 1.7) * vec3(0.030, 0.050, 0.125) * 1.5 + vec3(0.002, 0.003, 0.008);
  vec3 col = mix(mix(groundDusk, groundNight, uNight), mix(skyDusk, skyNight, uNight), sky);

  // Fixtures.
  vec2 p = vec2(cuv.x * A, cuv.y);
  float solid = 1.0 - sky;
  float lit = 0.0;
  float halo = 0.0;
  for (int i = 0; i < N; i++) {
    float I = uLI[i];
    if (I <= 0.0) continue;
    vec2 v0 = p - uLP[i];
    vec2 v = vec2(v0.x, v0.y * uLA[i].z);
    float dist = length(v) + 1e-4;
    vec2 n = v / dist;
    float c = uLA[i].x;
    // Gaussian across the beam: a scallop with no hard edge.
    float spot = c < -0.5 ? 1.0 : exp(-2.4 * pow(acos(clamp(dot(n, uLD[i]), -1.0, 1.0)) / acos(c), 2.0));
    float r = dist / uLA[i].y;
    // The beam opens a little above its source, so there is no hot dot
    // at the fixture, then falls away up the wall.
    float att = smoothstep(0.0, 0.07, r) * pow(max(1.0 - r, 0.0), 1.5) / (0.55 + 2.2 * r);
    float rake = clamp(1.0 - 7.0 * dot(grad, n), 0.55, 1.7);
    lit += I * spot * att * rake;
    halo += I * exp(-dot(v0, v0) / 0.0000035);
  }

  // The visitor's light: a hand-held lamp close to the wall.
  {
    vec2 v = p - uCur;
    float dist = length(v) + 1e-4;
    float r = dist / 0.2;
    float att = pow(max(1.0 - r, 0.0), 1.5) / (0.45 + 2.2 * r);
    float rake = clamp(1.0 - 11.0 * dot(grad, v / dist), 0.4, 1.9);
    lit += uCurInt * att * rake;
  }

  // Holiday state: each string throws a tight glow onto the fascia it hangs
  // from and a wider, fainter one onto the wall and roof beside it.
  if (uHoliday > 0.001) {
    float dm = 1.0;
    for (int i = 0; i < S; i++) dm = min(dm, segDist(p, uSeg[i]));
    lit += uHoliday * (exp(-dm * dm / 0.00012) * 1.1 + exp(-dm * dm / 0.0030) * 0.22 + 0.03);
  }

  // Rooms lit from inside: the day pixels of the glass, warmed.
  float win = 0.0;
  for (int i = 0; i < W; i++) {
    vec2 q = abs(cuv - uWin[i].xy) - uWin[i].zw;
    win += 1.0 - smoothstep(-0.003, 0.002, max(q.x, q.y));
  }
  col += d * vec3(1.0, 0.56, 0.22) * win * uWinI;

  col += d * WARM * lit * solid * 1.15;
  col += vec3(1.0, 0.66, 0.34) * halo * 0.35;

  // Soft shoulder so the hottest scallops roll off instead of clipping.
  col = 1.0 - exp(-col * 1.5);

  // The drawing the page opens on, dissolving into the photograph.
  if (uIntro > 0.001) {
    float dr = texture2D(tDraw, vec2(cuv.x, 1.0 - cuv.y)).r;
    vec3 paper = pow(dr, 2.2) * vec3(0.78, 0.74, 0.66) * 0.62;
    // Strokes give way first, paper last.
    float show = smoothstep(0.0, 1.0, (1.0 - uIntro) * 1.7 - dr * 0.7);
    col = mix(paper, col, show);
  }

  // The photo fades to ink where the copy sits and at its own edges.
  float inside = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.94, uv.y);
  inside *= uFrame.x < 0.999 ? 1.0 - smoothstep(0.80, 1.0, yt) : 1.0;
  col = mix(INK, col, inside);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
}
`;

const bulbVertex = /* glsl */ `
attribute vec2 aUv;
attribute vec2 aBulb;
varying float vB;
uniform vec2 uC;
uniform float uZ;
uniform vec2 uF;
uniform vec2 uFrame;
uniform float uPx;
uniform float uHoliday;
void main() {
  vec2 q = (aUv - uC) * uZ / uF + 0.5;
  vec2 s = vec2(q.x + uFrame.y, q.y * uFrame.x);
  gl_Position = vec4(s.x * 2.0 - 1.0, 1.0 - s.y * 2.0, 0.0, 1.0);
  vB = aBulb.y;
  gl_PointSize = uHoliday > 0.001 ? uPx * uZ * aBulb.x : 0.0;
}
`;

const bulbFragment = /* glsl */ `
uniform float uHoliday;
varying float vB;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  // A crisp bulb with a tight bloom. The glow on the house itself is done
  // in the photo shader, where it lands on real surfaces.
  float core = smoothstep(0.26, 0.12, r);
  float bloom = pow(max(1.0 - r, 0.0), 4.0) * 0.38;
  vec3 col = vec3(1.0, 0.83, 0.56) * core * 1.5 + vec3(1.0, 0.55, 0.22) * bloom;
  gl_FragColor = vec4(col * uHoliday * vB, 1.0);
  #include <colorspace_fragment>
}
`;

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

export default function PhotoStage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const stop = startTimeline();
    const base = document.getElementById('stage')?.dataset.assets ?? '/home/';
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x08090b);
    el.appendChild(renderer.domElement);

    const dprCap = coarse ? 1.5 : 1.75;
    const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio, dprCap) > 1500;
    const loader = new THREE.TextureLoader();
    const load = (file: string, srgb: boolean) =>
      new Promise<THREE.Texture>((res, rej) =>
        loader.load(
          base + file,
          (t) => {
            if (srgb) t.colorSpace = THREE.SRGBColorSpace;
            t.minFilter = THREE.LinearFilter;
            t.generateMipmaps = false;
            res(t);
          },
          undefined,
          rej,
        ),
      );

    const lp = FIXTURES.map((f) => new THREE.Vector2((f.at[0] / 100) * IMG_ASPECT, f.at[1] / 100));
    const ld = FIXTURES.map((f) => new THREE.Vector2(...(f.dir ?? down)).normalize());
    const la = FIXTURES.map((f) => new THREE.Vector3(f.deg ? Math.cos((f.deg * Math.PI) / 180) : -1, f.reach, f.squash ?? 1));
    while (lp.length < N) {
      lp.push(new THREE.Vector2());
      ld.push(new THREE.Vector2(0, 1));
      la.push(new THREE.Vector3(-1, 1, 1));
    }

    const view = { uC: { value: new THREE.Vector2(0.5, 0.53) }, uZ: { value: 1 }, uF: { value: new THREE.Vector2(1, 1) }, uFrame: { value: new THREE.Vector2(1, 0) } };
    const uniforms = {
      ...view,
      tDay: { value: null as THREE.Texture | null },
      tSky: { value: null as THREE.Texture | null },
      tDraw: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / 2400, 1 / 1800) },
      uNight: { value: 0 },
      uHoliday: { value: 0 },
      uIntro: { value: 1 },
      uLP: { value: lp },
      uLD: { value: ld },
      uLA: { value: la },
      uLI: { value: new Array<number>(N).fill(0) },
      uCur: { value: new THREE.Vector2(0.8, 0.6) },
      uCurInt: { value: 0 },
      uSeg: { value: [] as THREE.Vector4[] },
      uWin: { value: WINDOWS.map((w) => new THREE.Vector4(w[0] / 100, w[1] / 100, w[2] / 100, w[3] / 100)) },
      uWinI: { value: 0 },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, depthTest: false }));
    quad.frustumCulled = false;
    scene.add(quad);

    // Strings: C9 bulbs clipped at an exact, even pitch along each run, as a
    // professional install is. No wobble; only a hair of variation in output.
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    const bulb: number[] = [];
    const segs: THREE.Vector4[] = [];
    for (const line of STRINGS) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i];
        const [bx, by] = line[i + 1];
        segs.push(new THREE.Vector4((ax / 100) * IMG_ASPECT, ay / 100, (bx / 100) * IMG_ASPECT, by / 100));
        const n = Math.max(2, Math.round(Math.hypot((bx - ax) * IMG_ASPECT, by - ay) / 1.05));
        // Skip the first bulb of a continuing run so corners are not doubled.
        for (let j = i === 0 ? 0 : 1; j <= n; j++) {
          pts.push((ax + ((bx - ax) * j) / n) / 100, (ay + ((by - ay) * j) / n) / 100);
          bulb.push(1.0, 0.94 + rnd() * 0.1);
        }
      }
    }
    // Net lights: many small points scattered through a shrub.
    for (const net of NETS) {
      for (let i = 0; i < net.n; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * 0.94;
        pts.push((net.c[0] + Math.cos(a) * r * net.r[0]) / 100, (net.c[1] + Math.sin(a) * r * net.r[1]) / 100);
        bulb.push(0.5 + rnd() * 0.2, 0.45 + rnd() * 0.45);
      }
    }
    while (segs.length < 12) segs.push(new THREE.Vector4(9, 9, 9, 9));
    uniforms.uSeg.value = segs;
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute('aUv', new THREE.Float32BufferAttribute(pts, 2));
    bulbGeo.setAttribute('aBulb', new THREE.Float32BufferAttribute(bulb, 2));
    bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((pts.length / 2) * 3), 3));
    const bulbUniforms = { ...view, uPx: { value: 10 }, uHoliday: uniforms.uHoliday };
    const bulbs = new THREE.Points(
      bulbGeo,
      new THREE.ShaderMaterial({ vertexShader: bulbVertex, fragmentShader: bulbFragment, uniforms: bulbUniforms, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    bulbs.frustumCulled = false;
    scene.add(bulbs);

    // Layout: wide screens keep the photo full height and slide it right to
    // clear the copy; tall screens give it the upper part and fade the rest.
    const layout = { w: 1, h: 1, wide: true };
    const resize = () => {
      layout.w = el.clientWidth;
      layout.h = el.clientHeight;
      const as = layout.w / layout.h;
      layout.wide = as > 1.05;
      const frame = layout.wide ? 1 : 0.64;
      const af = as / frame;
      view.uFrame.value.set(frame, layout.wide ? 0.13 : 0);
      view.uF.value.set(af > IMG_ASPECT ? 1 : af / IMG_ASPECT, af > IMG_ASPECT ? IMG_ASPECT / af : 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
      renderer.setSize(layout.w, layout.h);
      bulbUniforms.uPx.value = ((layout.h * frame) / view.uF.value.y) * 0.0125 * renderer.getPixelRatio();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 0.62, y: 0.5, used: false };
    const move = (ev: PointerEvent) => {
      pointer.x = ev.clientX / layout.w;
      pointer.y = ev.clientY / layout.h;
      pointer.used = true;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });

    let raf = 0;
    let alive = true;
    let last = performance.now();
    const cur = new THREE.Vector2(0.6, 0.6);
    const want = new THREE.Vector2();
    const c = new THREE.Vector2(0.5, 0.53);
    let z = 1;

    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // View.
      const i = Math.min(Math.floor(state.k), KEYS.length - 2);
      const f = smoother(Math.min(Math.max(state.k - i, 0), 1));
      const a = KEYS[i];
      const b = KEYS[i + 1];
      // Tall screens cannot zoom out past the frame, so they start at 1.
      const tz = layout.wide ? a.z + (b.z - a.z) * f : Math.max(1, a.z + (b.z - a.z) * f) + 0.04;
      const fx = view.uF.value.x / tz;
      const fy = view.uF.value.y / tz;
      let tx = (a.c[0] + (b.c[0] - a.c[0]) * f) / 100;
      let ty = (a.c[1] + (b.c[1] - a.c[1]) * f) / 100;
      if (!layout.wide) tx = tx * 0.5 + 0.29;
      tx = fx >= 1 ? 0.5 : Math.min(Math.max(tx, fx / 2), 1 - fx / 2);
      ty = fy >= 1 ? 0.5 : Math.min(Math.max(ty, fy / 2), 1 - fy / 2);
      const ease = state.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      c.x += (tx - c.x) * ease;
      c.y += (ty - c.y) * ease;
      z += (tz - z) * ease;
      view.uC.value.copy(c);
      view.uZ.value = z;

      // The visitor's light, in image coordinates. It drifts on its own
      // until the first move or touch.
      if (pointer.used) {
        want.set(c.x + (pointer.x - view.uFrame.value.y - 0.5) * (view.uF.value.x / z), c.y + (pointer.y / view.uFrame.value.x - 0.5) * (view.uF.value.y / z));
      } else {
        const t = now / 1000;
        want.set(0.58 + Math.sin(t * 0.3) * 0.16, 0.6 + Math.sin(t * 0.47) * 0.1);
      }
      cur.lerp(want, state.reduced ? 1 : 1 - Math.exp(-dt * 8));
      uniforms.uCur.value.set(cur.x * IMG_ASPECT, cur.y);
      uniforms.uCurInt.value = 0.55 + 0.75 * state.night;

      uniforms.uNight.value = state.night;
      uniforms.uWinI.value = 0.05 + 0.5 * state.night;
      uniforms.uHoliday.value = state.groups[G.holiday];
      state.groups[G.entry] = 0.3 + 0.7 * state.night;
      FIXTURES.forEach((fxr, n) => (uniforms.uLI.value[n] = fxr.power * state.groups[fxr.group]));

      renderer.render(scene, camera);
    };

    Promise.all([load(big ? 'day-2400.webp' : 'day-1400.webp', true), load('sky.png', false), load('drawing.webp', false)])
      .then(([dayT, skyT, drawT]) => {
        if (!alive) return;
        uniforms.tDay.value = dayT;
        uniforms.tSky.value = skyT;
        uniforms.tDraw.value = drawT;
        const img = dayT.image as HTMLImageElement;
        uniforms.uTexel.value.set(1 / img.width, 1 / img.height);
        raf = requestAnimationFrame(frame);
        window.dispatchEvent(new Event('regent:ready'));
        // Hold on the drawing, then let it give way to the house.
        // ?intro=0.5 holds the dissolve at a fixed point, for checking it.
        const hold = new URLSearchParams(window.location.search).get('intro');
        if (hold !== null) uniforms.uIntro.value = Number(hold);
        else if (state.reduced) uniforms.uIntro.value = 0;
        else gsap.to(uniforms.uIntro, { value: 0, duration: 2.6, delay: 2.6, ease: 'power2.inOut' });
      })
      .catch(() => window.dispatchEvent(new Event('regent:ready')));

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      gsap.killTweensOf(uniforms.uIntro);
      stop();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />;
}

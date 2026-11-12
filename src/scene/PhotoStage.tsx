import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { startTimeline, state } from './timeline';
import netBulbs from './nets.json';

// The hero is two real photographs of the same house. The opening dusk
// shot is the daytime photo, graded. Every lit section uses the real night
// photo as its base, and new fixtures light a surface map derived from it
// (night-alb: the photo with its existing light divided out), so the light
// lands on the real stone and siding of the real night scene.
// Coordinates are percentages of the night photo, origin top-left, except
// the first view key, which frames the day photo.

const IMG_ASPECT = 4 / 3;
const N = 24;
const G = { path: 0, uplight: 1, wash: 2, eave: 3, holiday: 4, entry: 5 } as const;

type Fx = { cap?: number; at: [number, number]; dir?: [number, number]; deg?: number; reach: number; squash?: number; power: number; group: number };
const up: [number, number] = [0, -1];
const down: [number, number] = [0, 1];

// The scheme follows how a lighting designer would treat this house: light
// the features, leave the rest dark. Corners and piers are grazed, never the
// middle of a wall under a window; one specimen plant is picked out; the
// entry is the warmest point; a tree behind the roof gives depth.
const FIXTURES: Fx[] = [
  // Path: ground fixtures on alternate edges of the walk, traced on the night
  // photo. Each has a lit cap on a short stem and a pool at its foot.
  ...([[9, 95.6], [19, 93.6], [28, 90.0], [36, 91.6], [52, 89.2], [62, 90.8], [72, 91.8]] as [number, number][]).map(
    (at): Fx => ({ at, cap: 1.4, reach: 0.075, squash: 2.5, power: 3.4, group: G.path }),
  ),
  // Porch: a downlight over the door, on with the path.
  { at: [49.6, 61.0], dir: down, deg: 44, reach: 0.22, power: 3.3, group: G.path },
  // Stone: grazers at the piers of the front gable and beside the door.
  { at: [55.8, 84.5], dir: [0.02, -1], deg: 21, reach: 0.36, power: 6.9, group: G.uplight },
  { at: [82.0, 86.0], dir: [-0.02, -1], deg: 21, reach: 0.4, power: 6.9, group: G.uplight },
  { at: [46.6, 84.0], dir: up, deg: 15, reach: 0.4, power: 6.0, group: G.uplight },
  // The clipped tree by the steps, lit as a specimen.
  { at: [59.8, 84.0], dir: up, deg: 40, reach: 0.2, power: 4.5, group: G.uplight },
  // The corner, so the house reads as a volume.
  { at: [86.0, 88.5], dir: [0.03, -1], deg: 17, reach: 0.48, power: 4.8, group: G.uplight },
  // Siding: one wash on the wing, the big shrub, and a downlight under the
  // gable peak.
  { at: [30.0, 78.0], dir: up, deg: 44, reach: 0.26, power: 4.5, group: G.wash },
  { at: [21.0, 86.0], dir: [0.1, -1], deg: 60, reach: 0.14, power: 2.4, group: G.wash },
  { at: [65.6, 23.6], dir: down, deg: 36, reach: 0.3, power: 4.8, group: G.wash },
  // Roofline: soffit light under the wing eave.
  { at: [26.5, 61.0], dir: down, deg: 50, reach: 0.16, power: 3.0, group: G.eave },
  { at: [33.5, 60.0], dir: down, deg: 50, reach: 0.16, power: 3.0, group: G.eave },
  // The lantern by the door.
  { at: [52.6, 65.8], reach: 0.08, power: 1.0, group: G.entry },
];

// Windows that glow from inside at night (centre x, y and half size, image %).
const WINDOWS: [number, number, number, number][] = [
  [66.6, 40.2, 2.6, 4.6],
  [51.3, 46.6, 1.0, 3.2],
  [27.0, 66.2, 1.3, 3.6],
  [31.9, 66.6, 1.4, 4.0],
];

// Shrub net lights are generated from the photo: bulbs sit only on real
// foliage (nets.json: x, y, size, brightness) and fx.png holds the glow they
// throw on the leaves (red) and where snow settles (green).

// Colour options for the holiday state. Bulbs cycle through the list.
const PALETTES: Record<string, [number, number, number][]> = {
  warm: [[1.0, 0.8, 0.52]],
  cool: [[0.72, 0.88, 1.0]],
  multi: [[1.0, 0.02, 0.02], [0.02, 0.95, 0.06], [0.04, 0.2, 1.0], [1.0, 0.6, 0.0]],
  redgreen: [[1.0, 0.02, 0.02], [0.02, 0.95, 0.06]],
  bluewhite: [[0.04, 0.2, 1.0], [0.85, 0.93, 1.0]],
};

// Stem of the clipped tree, wrapped; and a lit wreath on the door.
const TRUNK: [[number, number], [number, number]] = [[59.6, 74.2], [59.9, 83.0]];
const WREATH = { c: [51.0, 67.4] as [number, number], r: [0.9, 1.4] as [number, number] };

// Traced on the photo along the outer roof edge, so every run is dead
// straight on the real line of the house.
const STRINGS: [number, number][][] = [
  [[22.6, 60.0], [37.2, 57.7]],
  [[37.8, 57.3], [45.6, 46.6]],
  [[48.6, 41.6], [51.2, 37.0], [54.0, 39.6]],
  [[56.0, 41.4], [65.6, 21.0], [80.8, 32.0]],
  [[82.8, 32.6], [87.7, 15.6], [95.2, 54.0]],
  [[55.6, 57.6], [81.8, 54.6]],
];

// View per scene section: centre of interest (image %) and zoom.
const KEYS = [
  { c: [50, 52], z: 0.8 }, // day photo: the approved opening shot
  { c: [55, 56], z: 0.85 }, // night photo: the whole house, for the lighting buttons
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
uniform sampler2D tNight;
uniform sampler2D tAlb;
uniform sampler2D tNSky;
uniform sampler2D tFx;
uniform vec2 uTexel;
uniform vec2 uC;
uniform float uZ;
uniform vec2 uF;
uniform vec2 uFrame;
uniform float uMix;   // 0: day dusk shot, 1: night photo
uniform float uHoliday;
uniform float uIntro;
uniform float uSnow;
uniform vec2 uLP[N];
uniform vec2 uLH[N];
uniform vec2 uLD[N];
uniform vec3 uLA[N];
uniform float uLI[N];
uniform vec2 uCur;
uniform float uCurInt;
uniform vec4 uSeg[S];
uniform vec2 uSegI[S];
uniform vec3 uPal[4];
uniform float uPalN;
uniform vec3 uHolTint;
uniform vec4 uWin[W];
uniform float uWinI;
varying vec2 vUv;

const vec3 WARM = vec3(1.0, 0.55, 0.23);
const vec3 INK = vec3(0.0024, 0.0027, 0.0034);
const float A = ${IMG_ASPECT.toFixed(5)};

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float albL(vec2 t) { return luma(texture2D(tAlb, t).rgb); }

// The visitor's hand-held lamp, raking across whatever surface it is given.
float handLamp(vec2 p, vec2 grad) {
  vec2 v = p - uCur;
  float dist = length(v) + 1e-4;
  float r = dist / 0.2;
  float att = pow(max(1.0 - r, 0.0), 1.5) / (0.45 + 2.2 * r);
  return uCurInt * att * clamp(1.0 - 11.0 * dot(grad, v / dist), 0.4, 1.9);
}

void main() {
  float yt = (1.0 - vUv.y) / uFrame.x;
  vec2 uv = uC + (vec2(vUv.x - uFrame.y, yt) - 0.5) * uF / uZ;
  vec2 cuv = clamp(uv, 0.0, 1.0);
  vec2 t = vec2(cuv.x, 1.0 - cuv.y);
  vec2 p = vec2(cuv.x * A, cuv.y);

  // ---- The opening shot: the day photo graded to dusk ----
  vec3 dayCol = vec3(0.0);
  if (uMix < 0.999) {
    vec3 d = texture2D(tDay, t).rgb;
    float L = luma(d);
    float sk = texture2D(tSky, t).r;
    vec3 groundDusk = mix(vec3(L), d, 0.85) * vec3(0.50, 0.55, 0.74) * 0.60;
    vec3 skyDusk = d * vec3(0.34, 0.37, 0.62) * 0.8 + vec3(0.42, 0.17, 0.05) * smoothstep(0.2, 0.62, cuv.y) * 0.5;
    dayCol = mix(groundDusk, skyDusk, sk);
    vec2 e = vec2(1.0 / 2400.0, 1.0 / 1800.0) * 1.5;
    vec2 g = vec2(luma(texture2D(tDay, t + vec2(e.x, 0.0)).rgb) - luma(texture2D(tDay, t - vec2(e.x, 0.0)).rgb),
                  -(luma(texture2D(tDay, t + vec2(0.0, e.y)).rgb) - luma(texture2D(tDay, t - vec2(0.0, e.y)).rgb)));
    dayCol += d * WARM * handLamp(p, g) * (1.0 - sk) * 1.15;
  }

  // ---- Every lit section: the real night photo ----
  vec3 nightCol = vec3(0.0);
  if (uMix > 0.001) {
    vec3 base = texture2D(tNight, t).rgb;
    vec3 alb = texture2D(tAlb, t).rgb;
    float nsky = texture2D(tNSky, t).r;
    vec2 fx = texture2D(tFx, t).rg;
    float sn = fx.g * uSnow;
    base = mix(base, vec3(0.05, 0.06, 0.095) * (0.7 + 0.8 * luma(alb)), sn);
    alb = mix(alb, vec3(0.80, 0.82, 0.86) * (0.75 + 0.35 * luma(alb)), sn);
    float solid = 1.0 - nsky;

    // Relief from the surface map: a light rakes across stone and laps.
    vec2 e = uTexel * 1.5;
    vec2 grad = vec2(albL(t + vec2(e.x, 0.0)) - albL(t - vec2(e.x, 0.0)),
                     -(albL(t + vec2(0.0, e.y)) - albL(t - vec2(0.0, e.y))));

    float lit = 0.0;
    float halo = 0.0;
    float air = 0.0;
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
      // The beam opens just above its source, then falls away up the wall.
      float att = (c < -0.5 ? 1.0 : smoothstep(0.0, 0.07, r)) * pow(max(1.0 - r, 0.0), 1.5) / (0.55 + 2.2 * r);
      lit += I * spot * att * clamp(1.0 - 7.0 * dot(grad, n), 0.55, 1.7);
      air += (c < -0.5 ? 0.25 : 1.0) * I * spot * exp(-dot(v0, v0) / 0.006);
      vec2 vh = p - uLH[i];
      halo += I * exp(-dot(vh, vh) / 0.0000042);
    }
    lit += handLamp(p, grad);

    // Holiday: each run tints the fascia beside it in its nearest bulb's
    // colour, with a wider, fainter spill onto wall and roof.
    vec3 litH = vec3(0.0);
    if (uHoliday > 0.001) {
      float dm = 1.0;
      vec3 hc = uHolTint;
      for (int i = 0; i < S; i++) {
        vec2 pa = p - uSeg[i].xy, ba = uSeg[i].zw - uSeg[i].xy;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
        float dd = length(pa - ba * h);
        if (dd < dm) {
          dm = dd;
          hc = uPal[int(mod(floor(h * uSegI[i].x + 0.5) + uSegI[i].y, uPalN))];
        }
      }
      litH += uHoliday * (hc * exp(-dm * dm / 0.00006) * 0.85 + uHolTint * (exp(-dm * dm / 0.0030) * 0.24 + 0.02));
      litH += uHoliday * uHolTint * fx.r * 1.7;
    }

    float win = 0.0;
    for (int i = 0; i < W; i++) {
      vec2 q = abs(cuv - uWin[i].xy) - uWin[i].zw;
      win += 1.0 - smoothstep(-0.003, 0.002, max(q.x, q.y));
    }

    // The photo's own light stays; new light is added on the real surfaces.
    nightCol = base * 0.6;
    nightCol += alb * vec3(1.0, 0.52, 0.18) * win * uWinI * 0.6;
    nightCol += alb * (WARM * lit * 1.25 + litH * 1.2) * solid;
    nightCol += WARM * air * 0.004 + vec3(1.0, 0.70, 0.38) * halo * 0.5;
  }

  // The day shot fades out, there is a beat of darkness, and the night photo
  // fades in: the change of camera reads as nightfall, never as a double image.
  vec3 col = dayCol * (1.0 - smoothstep(0.0, 0.5, uMix)) + nightCol * smoothstep(0.5, 1.0, uMix);

  col = 1.0 - exp(-col * 1.7);
  col *= 1.0 - 0.3 * smoothstep(0.42, 0.85, length((cuv - vec2(0.55, 0.52)) * vec2(1.0, 1.15)));

  // The drawing the page opens on, dissolving into the photograph.
  if (uIntro > 0.001) {
    float dr = texture2D(tDraw, t).r;
    vec3 paper = pow(dr, 2.2) * vec3(0.78, 0.74, 0.66) * 0.62;
    float show = smoothstep(0.0, 1.0, (1.0 - uIntro) * 1.7 - dr * 0.7);
    col = mix(paper, col, show);
  }

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
attribute float aIdx;
uniform vec3 uPal[4];
uniform float uPalN;
varying float vB;
varying vec3 vCol;
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
  vCol = uPal[int(mod(aIdx, uPalN))];
  gl_PointSize = uHoliday > 0.001 ? uPx * uZ * aBulb.x : 0.0;
}
`;

const bulbFragment = /* glsl */ `
uniform float uHoliday;
varying float vB;
varying vec3 vCol;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  // A crisp bulb with a tight bloom. The glow on the house itself is done
  // in the photo shader, where it lands on real surfaces.
  float core = smoothstep(0.32, 0.14, r);
  float hot = smoothstep(0.10, 0.0, r);
  float bloom = pow(max(1.0 - r, 0.0), 3.0) * 0.6;
  // Saturated glass with a white-hot point at its centre.
  vec3 col = vCol * core * 2.4 + vec3(1.0) * hot * 0.7 + vCol * bloom;
  gl_FragColor = vec4(col * uHoliday * vB, 1.0);
  #include <colorspace_fragment>
}
`;

// Falling snow, in screen space. Kept off the copy column.
const flakeVertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uSnow;
uniform float uWide;
uniform float uDpr;
varying float vA;
void main() {
  float depth = aSeed.z;
  float x = fract(aSeed.x + sin(uTime * 0.3 + aSeed.y * 40.0) * 0.012 + uTime * 0.004);
  float y = fract(aSeed.y + uTime * mix(0.03, 0.085, depth));
  float keep = uWide > 0.5 ? smoothstep(0.24, 0.44, x) : 1.0 - smoothstep(0.5, 0.66, y);
  vA = mix(0.18, 0.6, depth) * uSnow * keep;
  gl_Position = vec4(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  gl_PointSize = mix(1.4, 4.2, depth * depth) * uDpr;
}
`;
const flakeFragment = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vec3(0.80, 0.86, 1.0) * smoothstep(1.0, 0.2, r) * vA, 1.0);
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
    const lh = FIXTURES.map((f) => new THREE.Vector2((f.at[0] / 100) * IMG_ASPECT, (f.at[1] - (f.cap ?? 0)) / 100));
    const ld = FIXTURES.map((f) => new THREE.Vector2(...(f.dir ?? down)).normalize());
    const la = FIXTURES.map((f) => new THREE.Vector3(f.deg ? Math.cos((f.deg * Math.PI) / 180) : -1, f.reach, f.squash ?? 1));
    while (lp.length < N) {
      lp.push(new THREE.Vector2());
      lh.push(new THREE.Vector2());
      ld.push(new THREE.Vector2(0, 1));
      la.push(new THREE.Vector3(-1, 1, 1));
    }

    const view = { uC: { value: new THREE.Vector2(0.5, 0.53) }, uZ: { value: 1 }, uF: { value: new THREE.Vector2(1, 1) }, uFrame: { value: new THREE.Vector2(1, 0) } };
    const uniforms = {
      ...view,
      tDay: { value: null as THREE.Texture | null },
      tSky: { value: null as THREE.Texture | null },
      tNight: { value: null as THREE.Texture | null },
      tAlb: { value: null as THREE.Texture | null },
      tNSky: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      tDraw: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1538) },
      uHoliday: { value: 0 },
      uIntro: { value: 1 },
      uLP: { value: lp },
      uLH: { value: lh },
      uLD: { value: ld },
      uLA: { value: la },
      uLI: { value: new Array<number>(N).fill(0) },
      uCur: { value: new THREE.Vector2(0.8, 0.6) },
      uCurInt: { value: 0 },
      uSeg: { value: [] as THREE.Vector4[] },
      uSegI: { value: [] as THREE.Vector2[] },
      uPal: { value: Array.from({ length: 4 }, () => new THREE.Vector3(1, 0.8, 0.52)) },
      uPalN: { value: 1 },
      uWin: { value: WINDOWS.map((w) => new THREE.Vector4(w[0] / 100, w[1] / 100, w[2] / 100, w[3] / 100)) },
      uWinI: { value: 0 },
      tFx: { value: null as THREE.Texture | null },
      uSnow: { value: 0 },
      uHolTint: { value: new THREE.Vector3(1.0, 0.6, 0.29) },
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
    const segInfo: THREE.Vector2[] = [];
    for (const line of STRINGS) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i];
        const [bx, by] = line[i + 1];
        segs.push(new THREE.Vector4((ax / 100) * IMG_ASPECT, ay / 100, (bx / 100) * IMG_ASPECT, by / 100));
        const n = Math.max(2, Math.round(Math.hypot((bx - ax) * IMG_ASPECT, by - ay) / 1.05));
        segInfo.push(new THREE.Vector2(n, pts.length / 2 - (i === 0 ? 0 : 1)));
        // Skip the first bulb of a continuing run so corners are not doubled.
        for (let j = i === 0 ? 0 : 1; j <= n; j++) {
          pts.push((ax + ((bx - ax) * j) / n) / 100, (ay + ((by - ay) * j) / n) / 100);
          bulb.push(1.0, 0.94 + rnd() * 0.1);
        }
      }
    }
    const idx: number[] = pts.length ? Array.from({ length: pts.length / 2 }, (_, k) => k) : [];
    // Net lights on the real foliage. Each net is one colour run.
    for (const [x, y, size, b] of netBulbs as number[][]) {
      pts.push(x, y);
      bulb.push(size, b);
      idx.push(Math.floor(rnd() * 4));
    }
    // Trunk wrap: tight turns up the stem.
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      pts.push((TRUNK[0][0] + (TRUNK[1][0] - TRUNK[0][0]) * t + (k % 2 ? 0.28 : -0.28)) / 100, (TRUNK[0][1] + (TRUNK[1][1] - TRUNK[0][1]) * t) / 100);
      bulb.push(0.42, 0.8);
      idx.push(k);
    }
    // Wreath: two rings of small lights.
    for (const [scale, n] of [[1, 18], [0.72, 12]] as const) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + scale;
        pts.push((WREATH.c[0] + Math.cos(a) * WREATH.r[0] * scale) / 100, (WREATH.c[1] + Math.sin(a) * WREATH.r[1] * scale) / 100);
        bulb.push(0.4, 0.9);
        idx.push(k);
      }
    }
    while (segs.length < 12) {
      segs.push(new THREE.Vector4(9, 9, 9, 9));
      segInfo.push(new THREE.Vector2(1, 0));
    }
    uniforms.uSeg.value = segs;
    uniforms.uSegI.value = segInfo;
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute('aUv', new THREE.Float32BufferAttribute(pts, 2));
    bulbGeo.setAttribute('aBulb', new THREE.Float32BufferAttribute(bulb, 2));
    bulbGeo.setAttribute('aIdx', new THREE.Float32BufferAttribute(idx, 1));
    bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((pts.length / 2) * 3), 3));
    const pal = uniforms.uPal.value;
    const bulbUniforms = { ...view, uPx: { value: 10 }, uHoliday: uniforms.uHoliday, uPal: uniforms.uPal, uPalN: uniforms.uPalN };
    const bulbs = new THREE.Points(
      bulbGeo,
      new THREE.ShaderMaterial({ vertexShader: bulbVertex, fragmentShader: bulbFragment, uniforms: bulbUniforms, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    bulbs.frustumCulled = false;
    scene.add(bulbs);

    const flakeCount = state.reduced ? 0 : coarse ? 260 : 520;
    const seeds = new Float32Array(flakeCount * 3).map(() => Math.random());
    const flakeGeo = new THREE.BufferGeometry();
    flakeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 3));
    flakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flakeCount * 3), 3));
    const flakeUniforms = { uTime: { value: 0 }, uSnow: uniforms.uSnow, uWide: { value: 1 }, uDpr: { value: 1 } };
    const flakes = new THREE.Points(
      flakeGeo,
      new THREE.ShaderMaterial({ vertexShader: flakeVertex, fragmentShader: flakeFragment, uniforms: flakeUniforms, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    flakes.frustumCulled = false;
    scene.add(flakes);

    // Choices made in the holiday section: light colour and snow.
    const choice = { snow: true };
    const applyPalette = (name: string) => {
      const list = PALETTES[name] ?? PALETTES.warm;
      list.forEach((c, k) => pal[k].set(c[0], c[1], c[2]));
      uniforms.uPalN.value = list.length;
      // Light thrown on the house takes the average colour of the bulbs.
      const avg = list.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((v) => v / list.length);
      const m = Math.max(...avg);
      if (name === 'warm') uniforms.uHolTint.value.set(1.0, 0.6, 0.29);
      else uniforms.uHolTint.value.set(avg[0] / m, avg[1] / m, avg[2] / m);
    };
    const onChoice = (ev: Event) => {
      const d = (ev as CustomEvent).detail ?? {};
      if (typeof d.palette === 'string') applyPalette(d.palette);
      if (typeof d.snow === 'boolean') choice.snow = d.snow;
    };
    window.addEventListener('regent:holiday', onChoice);

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
      bulbUniforms.uPx.value = ((layout.h * frame) / view.uF.value.y) * 0.0155 * renderer.getPixelRatio();
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

      uniforms.uMix.value = state.night;
      // Rooms come on with the roofline section, not before.
      uniforms.uWinI.value = 0.5 * Math.min(1, state.groups[G.eave]);
      uniforms.uHoliday.value = state.groups[G.holiday];
      // Snow settles over a few seconds once the December section arrives.
      const snowTarget = choice.snow ? Math.min(1, state.groups[G.holiday]) : 0;
      uniforms.uSnow.value += (snowTarget - uniforms.uSnow.value) * (state.reduced ? 1 : 1 - Math.exp(-dt * 0.9));
      flakeUniforms.uTime.value = now / 1000;
      flakeUniforms.uWide.value = layout.wide ? 1 : 0;
      flakeUniforms.uDpr.value = renderer.getPixelRatio();
      state.groups[G.entry] = 0.3 + 0.7 * state.night;
      FIXTURES.forEach((fxr, n) => (uniforms.uLI.value[n] = fxr.power * state.groups[fxr.group]));

      renderer.render(scene, camera);
    };

    Promise.all([
      load(big ? 'day-2400.webp' : 'day-1400.webp', true),
      load('sky.png', false),
      load('drawing.webp', false),
      load('night-fx.png', false),
      load(big ? 'night-2048.webp' : 'night-1280.webp', true),
      load('night-alb.webp', true),
      load('night-sky.png', false),
    ])
      .then(([dayT, skyT, drawT, fxT, nightT, albT, nskyT]) => {
        if (!alive) return;
        uniforms.tDay.value = dayT;
        uniforms.tSky.value = skyT;
        uniforms.tDraw.value = drawT;
        uniforms.tFx.value = fxT;
        uniforms.tNight.value = nightT;
        uniforms.tAlb.value = albT;
        uniforms.tNSky.value = nskyT;
        const img = albT.image as HTMLImageElement;
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
      window.removeEventListener('regent:holiday', onChoice);
      gsap.killTweensOf(uniforms.uIntro);
      stop();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />;
}

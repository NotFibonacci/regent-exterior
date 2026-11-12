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

const FIXTURES: Fx[] = [
  // Path lights along the flagstone walk: round pools, flattened by perspective.
  ...([[12, 89.5], [25, 87.5], [37, 85.5], [50, 86.8], [62, 88.8], [73, 90]] as [number, number][]).map((at) => ({ at, reach: 0.085, squash: 3.0, power: 1.25, group: G.path })),
  // Uplights at the foot of the stone.
  { at: [43.3, 79], dir: up, deg: 27, reach: 0.3, power: 5.1, group: G.uplight },
  { at: [50.4, 80], dir: up, deg: 27, reach: 0.3, power: 5.1, group: G.uplight },
  { at: [53.6, 82.5], dir: up, deg: 30, reach: 0.33, power: 5.7, group: G.uplight },
  { at: [69, 85], dir: up, deg: 30, reach: 0.35, power: 5.7, group: G.uplight },
  { at: [76.6, 86], dir: up, deg: 30, reach: 0.36, power: 5.7, group: G.uplight },
  // Wall wash on the siding: wing, the gable above the stone, the side wall.
  { at: [33.5, 78.5], dir: up, deg: 38, reach: 0.26, power: 3.9, group: G.wash },
  { at: [40.5, 77.5], dir: up, deg: 38, reach: 0.26, power: 3.9, group: G.wash },
  { at: [55.5, 52.6], dir: [0.1, -1], deg: 40, reach: 0.34, power: 3.45, group: G.wash },
  { at: [70.5, 52.4], dir: [-0.12, -1], deg: 40, reach: 0.34, power: 3.45, group: G.wash },
  { at: [83, 84], dir: [0.03, -1], deg: 32, reach: 0.5, power: 4.2, group: G.wash },
  // Soffit downlights under the overhang and the wing eave.
  { at: [57, 54.4], dir: down, deg: 46, reach: 0.2, power: 3.0, group: G.eave },
  { at: [64.5, 54.4], dir: down, deg: 46, reach: 0.2, power: 3.0, group: G.eave },
  { at: [72, 54.2], dir: down, deg: 46, reach: 0.2, power: 3.0, group: G.eave },
  { at: [25, 58], dir: down, deg: 46, reach: 0.17, power: 2.7, group: G.eave },
  { at: [31, 57.3], dir: down, deg: 46, reach: 0.17, power: 2.7, group: G.eave },
  // The lantern by the door comes up with nightfall.
  { at: [49.3, 61.2], reach: 0.075, power: 1.1, group: G.entry },
];

// Rooflines that carry holiday string lights.
const STRINGS: [number, number][][] = [
  [[20.3, 57.2], [34.2, 55.6]],
  [[34.5, 55.4], [43, 43.2]],
  [[44.6, 38.2], [47.6, 33.6], [50.4, 37.4]],
  [[50.6, 40.2], [61, 20.2], [74.6, 32.2]],
  [[76.2, 30.6], [82.4, 15.2], [89.6, 46]],
  [[51.4, 53.4], [74.4, 53]],
  [[43.3, 55.6], [48.9, 55.3]],
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
varying vec2 vUv;

const vec3 WARM = vec3(1.0, 0.60, 0.29);
const vec3 INK = vec3(0.0024, 0.0027, 0.0034);
const float A = ${IMG_ASPECT.toFixed(5)};

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 day(vec2 uv) { return texture2D(tDay, vec2(uv.x, 1.0 - uv.y)).rgb; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

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
    float att = pow(max(1.0 - r, 0.0), 1.6) / (0.35 + 2.5 * r);
    float rake = clamp(1.0 - 7.0 * dot(grad, n), 0.55, 1.7);
    lit += I * spot * att * rake;
    halo += I * exp(-dot(v0, v0) / 0.000006);
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

  // Holiday state: a low warm spill over the house from the string lights.
  lit += uHoliday * 0.12 * smoothstep(0.95, 0.35, cuv.y);

  col += d * WARM * lit * solid * 1.15;
  col += vec3(1.0, 0.66, 0.34) * halo * 0.7;

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
  gl_PointSize = uHoliday > 0.001 ? uPx * uZ : 0.0;
}
`;

const bulbFragment = /* glsl */ `
uniform float uHoliday;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(0.3, 0.0, r);
  float glow = pow(max(1.0 - r, 0.0), 2.4);
  gl_FragColor = vec4((vec3(1.0, 0.62, 0.3) * glow * 0.75 + vec3(1.0, 0.9, 0.74) * core) * uHoliday, 1.0);
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
    };

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, depthTest: false }));
    quad.frustumCulled = false;
    scene.add(quad);

    const pts: number[] = [];
    for (const line of STRINGS) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i];
        const [bx, by] = line[i + 1];
        const n = Math.max(2, Math.round(Math.hypot((bx - ax) * IMG_ASPECT, by - ay) / 1.05));
        for (let j = 0; j <= n; j++) pts.push((ax + ((bx - ax) * j) / n) / 100, (ay + ((by - ay) * j) / n) / 100);
      }
    }
    const bulbGeo = new THREE.BufferGeometry();
    bulbGeo.setAttribute('aUv', new THREE.Float32BufferAttribute(pts, 2));
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
      bulbUniforms.uPx.value = ((layout.h * frame) / view.uF.value.y) * 0.011 * renderer.getPixelRatio();
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

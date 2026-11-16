import { useEffect, useRef } from 'react';
import { getWeather, type Weather } from './weather';
import * as THREE from 'three';
import gsap from 'gsap';
import { startTimeline, state } from './timeline';

// The hero is built from photographs of one real house.
// - Opening: the daytime photo graded to dusk, under the charcoal drawing.
// - Night: an unlit base plus one "light layer" per lighting type. Each layer
//   holds only the light that type adds (derived from the owner's mockups of
//   the same frame), so any combination can be switched on and the layers
//   are combined by taking the brighter value, as real exposures would be.
// - The visitor's hand-held lamp reveals the real night photograph.

const IMG_ASPECT = 4 / 3;
const G = { path: 0, stone: 1, eaves: 3, holiday: 4 } as const;

// Color options for the holiday layer. Bulbs take one of up to four colors.
const PALETTES: Record<string, [number, number, number][]> = {
  warm: [],
  cool: [[0.72, 0.88, 1.0]],
  multi: [[1.0, 0.03, 0.03], [0.03, 0.95, 0.08], [0.05, 0.22, 1.0], [1.0, 0.6, 0.0]],
  redgreen: [[1.0, 0.03, 0.03], [0.03, 0.95, 0.08]],
  bluewhite: [[0.05, 0.22, 1.0], [0.85, 0.93, 1.0]],
};

// View: center (image %) and zoom for the opening shot and the night scene.
const KEYS = [
  { c: [50, 52], z: 0.8 },
  { c: [50, 50], z: 0.8 },
];

const vertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
uniform sampler2D tDay;
uniform sampler2D tSky;
uniform sampler2D tDraw;
uniform sampler2D tBase;
uniform sampler2D tReal;
uniform sampler2D tPath;
uniform sampler2D tStone;
uniform sampler2D tEave;
uniform sampler2D tHol;
uniform sampler2D tTier;  // per layer: lowest tier at which each pixel lights (1-3)
uniform vec4 uTier;       // chosen tier per layer, animated between whole numbers
uniform sampler2D tMap;   // r: bulb color index, g: nearness to a bulb, b: snow cover, a: not-sky
uniform vec2 uC;
uniform float uZ;
uniform vec2 uF;
uniform vec2 uFrame;
uniform float uMix;       // 0: dusk opening, 1: night scene
uniform float uIntro;
uniform vec4 uOn;         // path, stone, eaves, holiday
uniform float uSnow;
uniform float uRain;      // live weather: wet ground
uniform float uFog;
uniform float uCloud;     // overcast sky
uniform vec3 uPal[4];
uniform float uPalN;      // 0 keeps the mockup's own warm white
uniform vec2 uCur;
uniform float uCurInt;
varying vec2 vUv;

const vec3 WARM = vec3(1.0, 0.55, 0.23);
const vec3 INK = vec3(0.0024, 0.0027, 0.0034);
const float A = ${IMG_ASPECT.toFixed(5)};

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float handLamp(vec2 p) {
  float r = length(p - uCur) / 0.2;
  return uCurInt * pow(max(1.0 - r, 0.0), 1.5) / (0.45 + 2.2 * r);
}

void main() {
  float yt = (1.0 - vUv.y) / uFrame.x;
  vec2 uv = uC + (vec2(vUv.x - uFrame.y, yt) - 0.5) * uF / uZ;
  vec2 cuv = clamp(uv, 0.0, 1.0);
  vec2 t = vec2(cuv.x, 1.0 - cuv.y);
  vec2 p = vec2(cuv.x * A, cuv.y);

  vec3 dayCol = vec3(0.0);
  if (uMix < 0.5) {
    vec3 d = texture2D(tDay, t).rgb;
    float L = luma(d);
    float sk = texture2D(tSky, t).r;
    vec3 groundDusk = mix(vec3(L), d, 0.85) * vec3(0.50, 0.55, 0.74) * 0.60;
    vec3 skyDusk = d * vec3(0.34, 0.37, 0.62) * 0.8 + vec3(0.42, 0.17, 0.05) * smoothstep(0.2, 0.62, cuv.y) * 0.5;
    dayCol = mix(groundDusk, skyDusk, sk) + d * WARM * handLamp(p) * (1.0 - sk) * 1.15;
  }

  vec3 nightCol = vec3(0.0);
  if (uMix > 0.5) {
    vec3 base = texture2D(tBase, t).rgb;
    vec4 map = texture2D(tMap, t);
    float sn = map.b * uSnow;

    // Each layer is the mockup for that lighting type plus a mask of where
    // it is lit. Inside the mask the mockup itself is shown; where several
    // are on, the brighter one wins, as overlapping light would.
    vec4 lp = texture2D(tPath, t), ls = texture2D(tStone, t), le = texture2D(tEave, t), lh = texture2D(tHol, t);
    if (uPalN > 0.5) {
      // Recolor the string lights bulb by bulb; spill away from a bulb
      // stays close to neutral so white trim is never blotched.
      vec3 glow = max(lh.rgb - base, 0.0);
      float l = luma(glow);
      vec3 own = uPal[int(mod(floor(map.r * 3.0 + 0.5), uPalN))];
      vec3 avg = (uPal[0] + uPal[1] + uPal[2] + uPal[3]) * 0.25;
      glow = mix(mix(vec3(l), avg * l * 1.3, 0.45), own * l * 2.2 + vec3(1.0) * smoothstep(0.55, 1.0, l) * 0.5, map.g * map.g);
      lh.rgb = min(lh.rgb, base) + glow;
    }
    // A part of a layer shows once the chosen tier reaches its own tier.
    vec4 need = texture2D(tTier, t) * 3.0;
    vec4 on = min(uOn, vec4(1.0)) * clamp(uTier - need + 1.0, 0.0, 1.0);
    // Each layer adds its own light (its mockup minus the base, inside its
    // mask). The strongest addition wins per pixel, so switching on another
    // layer can never dim one that is already on. Layers that are off sit
    // at -1 so they never win.
    vec4 wk = vec4(lp.a, ls.a, le.a, lh.a) * on;
    vec4 live = step(0.0005, wk);
    vec3 cp = (lp.rgb - base) * wk.x - (1.0 - live.x);
    vec3 cs = (ls.rgb - base) * wk.y - (1.0 - live.y);
    vec3 ce = (le.rgb - base) * wk.z - (1.0 - live.z);
    vec3 ch = (lh.rgb - base) * wk.w - (1.0 - live.w);
    float w = max(max(wk.x, wk.y), max(wk.z, wk.w));
    nightCol = base + (w > 0.0005 ? max(max(cp, cs), max(ce, ch)) : vec3(0.0));
    // With holiday lights on, the rest of the night drops a little darker so
    // the bulbs carry the picture, as they do to the eye.
    nightCol *= mix(1.0, 0.72, on.w * (1.0 - lh.a * on.w));
    // Settled snow keeps the shading of what lies under it and throws light back.
    float nl = luma(nightCol);
    nightCol = mix(nightCol, mix(vec3(0.085, 0.10, 0.15) * (0.55 + 6.0 * nl), nightCol * 2.2 + 0.02, smoothstep(0.02, 0.2, nl) * w), sn);
    nightCol += texture2D(tReal, t).rgb * WARM * handLamp(p) * map.a * 1.4;
  }

  // Dusk fades out, a beat of darkness, the night scene fades in.
  vec3 col = dayCol * (1.0 - smoothstep(0.0, 0.5, uMix)) + nightCol * smoothstep(0.5, 1.0, uMix);
  col = uMix > 0.5 ? col : 1.0 - exp(-col * 1.7);

  if (uIntro > 0.001) {
    float dr = texture2D(tDraw, t).r;
    vec3 paper = pow(dr, 2.2) * vec3(0.78, 0.74, 0.66) * 0.62;
    col = mix(paper, col, smoothstep(0.0, 1.0, (1.0 - uIntro) * 1.7 - dr * 0.7));
  }

  // Live Maryland weather. Overcast flattens the sky; rain darkens and cools
  // the ground while the lights keep their warmth; fog lifts the blacks.
  float skyM = uMix > 0.5 ? 1.0 - texture2D(tMap, t).a : texture2D(tSky, t).r;
  float cl = luma(col);
  col = mix(col, vec3(cl) * vec3(0.92, 0.95, 1.0) * 1.05 + 0.004, uCloud * 0.75 * skyM);
  col = mix(col, col * vec3(0.82, 0.87, 0.95), uRain * (1.0 - skyM) * (1.0 - smoothstep(0.05, 0.35, cl)));
  col = mix(col, mix(vec3(0.16, 0.17, 0.2), vec3(0.03, 0.034, 0.042), step(0.5, uMix)) + col * 0.4, uFog * 0.4);

  float inside = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.94, uv.y);
  inside *= uFrame.x < 0.999 ? 1.0 - smoothstep(0.86, 1.0, yt) : 1.0;
  col = mix(INK, col, inside);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
}
`;

// Falling snow, in screen space, kept off the copy.
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

// Falling rain: short slanted streaks, same copy exclusion as the snow.
const rainVertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uRain;
uniform float uWide;
uniform float uDpr;
varying float vA;
void main() {
  float depth = aSeed.z;
  float y = fract(aSeed.y + uTime * mix(0.55, 1.1, depth));
  float x = fract(aSeed.x + y * 0.06);
  float keep = uWide > 0.5 ? smoothstep(0.24, 0.44, x) : 1.0 - smoothstep(0.5, 0.66, y);
  vA = mix(0.05, 0.2, depth) * uRain * keep;
  gl_Position = vec4(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  gl_PointSize = mix(10.0, 28.0, depth) * uDpr;
}
`;
const rainFragment = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float streak = smoothstep(0.07, 0.0, abs(q.x + q.y * 0.12)) * smoothstep(0.5, 0.15, abs(q.y));
  gl_FragColor = vec4(vec3(0.72, 0.8, 0.95) * streak * vA, 1.0);
  #include <colorspace_fragment>
}
`;

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

export default function PhotoStage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const stop = startTimeline();
    const stage = document.getElementById('stage');
    const base = stage?.dataset.assets ?? '/';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // Switches that sit on the house itself; positioned every frame.
    const spots = Array.from(document.querySelectorAll<HTMLElement>('[data-spot]')).map((node) => {
      const [x, y] = node.dataset.spot!.split(',').map(Number);
      return { node, x: x / 100, y: y / 100 };
    });
    const spotLayer = document.querySelector<HTMLElement>('.spots');

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setClearColor(0x08090b);
    el.appendChild(renderer.domElement);

    const dprCap = coarse ? 1.5 : 1.75;
    const big = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio, dprCap) > 1500;
    const loader = new THREE.TextureLoader();
    const load = (file: string, srgb: boolean, nearest = false) =>
      new Promise<THREE.Texture>((res, rej) =>
        loader.load(
          base + file,
          (t) => {
            if (srgb) t.colorSpace = THREE.SRGBColorSpace;
            t.minFilter = t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
            t.generateMipmaps = false;
            res(t);
          },
          undefined,
          rej,
        ),
      );

    const view = { uC: { value: new THREE.Vector2(0.5, 0.52) }, uZ: { value: 0.8 }, uF: { value: new THREE.Vector2(1, 1) }, uFrame: { value: new THREE.Vector2(1, 0) } };
    const tex = () => ({ value: null as THREE.Texture | null });
    const uniforms = {
      ...view,
      tDay: tex(), tSky: tex(), tDraw: tex(), tBase: tex(), tReal: tex(), tPath: tex(), tStone: tex(), tEave: tex(), tHol: tex(), tMap: tex(), tTier: tex(),
      uMix: { value: 0 },
      uIntro: { value: 1 },
      uOn: { value: new THREE.Vector4() },
      uTier: { value: new THREE.Vector4(3, 3, 3, 3) },
      uSnow: { value: 0 },
      uRain: { value: 0 },
      uFog: { value: 0 },
      uCloud: { value: 0 },
      uPal: { value: Array.from({ length: 4 }, () => new THREE.Vector3(1, 1, 1)) },
      uPalN: { value: 0 },
      uCur: { value: new THREE.Vector2(0.8, 0.6) },
      uCurInt: { value: 0 },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, depthTest: false }));
    quad.frustumCulled = false;
    scene.add(quad);

    const flakeCount = state.reduced ? 0 : coarse ? 260 : 520;
    const flakeGeo = new THREE.BufferGeometry();
    flakeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Float32Array(flakeCount * 3).map(() => Math.random()), 3));
    flakeGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flakeCount * 3), 3));
    const flakeUniforms = { uTime: { value: 0 }, uSnow: uniforms.uSnow, uWide: { value: 1 }, uDpr: { value: 1 } };
    const flakes = new THREE.Points(
      flakeGeo,
      new THREE.ShaderMaterial({ vertexShader: flakeVertex, fragmentShader: flakeFragment, uniforms: flakeUniforms, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    flakes.frustumCulled = false;
    scene.add(flakes);

    const dropCount = state.reduced ? 0 : coarse ? 300 : 650;
    const dropGeo = new THREE.BufferGeometry();
    dropGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Float32Array(dropCount * 3).map(() => Math.random()), 3));
    dropGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(dropCount * 3), 3));
    const rainUniforms = { uTime: flakeUniforms.uTime, uRain: uniforms.uRain, uWide: flakeUniforms.uWide, uDpr: flakeUniforms.uDpr };
    const drops = new THREE.Points(
      dropGeo,
      new THREE.ShaderMaterial({ vertexShader: rainVertex, fragmentShader: rainFragment, uniforms: rainUniforms, transparent: true, blending: THREE.AdditiveBlending, depthTest: false }),
    );
    drops.frustumCulled = false;
    scene.add(drops);

    // Live weather targets, eased in the frame loop.
    const sky = { rain: 0, snow: 0, fog: 0, cloud: 0 };
    const live = { rain: 0, snow: 0, fog: 0, cloud: 0 };
    let weatherOff = false;
    try { weatherOff = localStorage.getItem('regent-weather-off') === '1'; } catch { /* storage unavailable */ }
    const applySky = () => Object.assign(sky, weatherOff ? { rain: 0, snow: 0, fog: 0, cloud: 0 } : live);
    const onWeatherOff = (ev: Event) => { weatherOff = !!(ev as CustomEvent).detail?.off; applySky(); };
    window.addEventListener('regent:weather-off', onWeatherOff);
    getWeather().then((w: Weather | null) => {
      if (!alive || !w) return;
      Object.assign(live, { rain: w.rain, snow: w.snow, fog: w.fog, cloud: w.cloud });
      applySky();
      window.dispatchEvent(new CustomEvent('regent:weather', { detail: w }));
    });

    // Tier per layer, eased so lights come and go rather than snap.
    const tierOrder = ['path', 'stone', 'eaves', 'holiday'];
    const onTier = (ev: Event) => {
      const d = (ev as CustomEvent).detail ?? {};
      const i = tierOrder.indexOf(d.layer);
      if (i < 0) return;
      const tgt = { v: uniforms.uTier.value.getComponent(i) };
      gsap.to(tgt, { v: Number(d.tier), duration: state.reduced ? 0 : 0.9, ease: 'power2.out', onUpdate: () => uniforms.uTier.value.setComponent(i, tgt.v) });
    };
    window.addEventListener('regent:tier', onTier);
    const choice = { snow: true };
    const onChoice = (ev: Event) => {
      const d = (ev as CustomEvent).detail ?? {};
      if (typeof d.palette === 'string') {
        const list = PALETTES[d.palette] ?? [];
        // Fill all four slots by repeating, so the average is right for short palettes.
        for (let k = 0; k < 4; k++) if (list.length) uniforms.uPal.value[k].set(...list[k % list.length]);
        uniforms.uPalN.value = list.length;
      }
      if (typeof d.snow === 'boolean') choice.snow = d.snow;
    };
    window.addEventListener('regent:holiday', onChoice);

    const layout = { w: 1, h: 1, wide: true };
    const resize = () => {
      layout.w = el.clientWidth;
      layout.h = el.clientHeight;
      const as = layout.w / layout.h;
      layout.wide = as > 1.05;
      const frame = layout.wide ? 1 : 0.6;
      const af = as / frame;
      view.uFrame.value.set(frame, layout.wide ? 0.13 : 0);
      view.uF.value.set(af > IMG_ASPECT ? 1 : af / IMG_ASPECT, af > IMG_ASPECT ? IMG_ASPECT / af : 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
      renderer.setSize(layout.w, layout.h);
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
    const c = new THREE.Vector2(0.5, 0.52);
    let z = 0.8;

    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const f = smoother(Math.min(Math.max(state.k, 0), 1));
      const a = KEYS[0];
      const b = KEYS[1];
      // Tall screens cannot zoom out past the frame; they crop to the house.
      const tz = layout.wide ? a.z + (b.z - a.z) * f : 1.0;
      const fx = view.uF.value.x / tz;
      const fy = view.uF.value.y / tz;
      let tx = (a.c[0] + (b.c[0] - a.c[0]) * f) / 100;
      let ty = (a.c[1] + (b.c[1] - a.c[1]) * f) / 100;
      if (!layout.wide) tx = 0.56;
      tx = fx >= 1 ? 0.5 : Math.min(Math.max(tx, fx / 2), 1 - fx / 2);
      ty = fy >= 1 ? 0.5 : Math.min(Math.max(ty, fy / 2), 1 - fy / 2);
      const ease = state.reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      c.x += (tx - c.x) * ease;
      c.y += (ty - c.y) * ease;
      z += (tz - z) * ease;
      view.uC.value.copy(c);
      view.uZ.value = z;

      if (pointer.used) {
        want.set(c.x + (pointer.x - view.uFrame.value.y - 0.5) * (view.uF.value.x / z), c.y + (pointer.y / view.uFrame.value.x - 0.5) * (view.uF.value.y / z));
      } else {
        const t = now / 1000;
        want.set(0.58 + Math.sin(t * 0.3) * 0.16, 0.6 + Math.sin(t * 0.47) * 0.1);
      }
      cur.lerp(want, state.reduced ? 1 : 1 - Math.exp(-dt * 8));
      uniforms.uCur.value.set(cur.x * IMG_ASPECT, cur.y);
      uniforms.uCurInt.value = state.night > 0.5 ? 0.16 : 0.55;

      uniforms.uMix.value = state.night;
      uniforms.uOn.value.set(state.groups[G.path], state.groups[G.stone], state.groups[G.eaves], state.groups[G.holiday]);
      // Snow follows the holiday choice or the real weather, whichever is more.
      const snowTarget = Math.max(choice.snow ? Math.min(1, state.groups[G.holiday]) : 0, sky.snow);
      const wxEase = state.reduced ? 1 : 1 - Math.exp(-dt * 0.9);
      uniforms.uSnow.value += (snowTarget - uniforms.uSnow.value) * wxEase;
      uniforms.uRain.value += (sky.rain - uniforms.uRain.value) * wxEase;
      uniforms.uFog.value += (sky.fog - uniforms.uFog.value) * wxEase;
      uniforms.uCloud.value += (sky.cloud - uniforms.uCloud.value) * wxEase;
      flakeUniforms.uTime.value = now / 1000;
      flakeUniforms.uWide.value = layout.wide ? 1 : 0;
      flakeUniforms.uDpr.value = renderer.getPixelRatio();

      // Place the on-house switches over their spot in the photograph.
      if (spotLayer) {
        const show = state.night > 0.92;
        spotLayer.classList.toggle('live', show);
        if (show) {
          for (const s of spots) {
            const sx = ((s.x - c.x) * z) / view.uF.value.x + 0.5 + view.uFrame.value.y;
            const sy = (((s.y - c.y) * z) / view.uF.value.y + 0.5) * view.uFrame.value.x;
            s.node.style.transform = `translate(${(sx * layout.w).toFixed(1)}px, ${(sy * layout.h).toFixed(1)}px)`;
          }
        }
      }

      renderer.render(scene, camera);
    };

    Promise.all([
      load(big ? 'home/day-2400.webp' : 'home/day-1400.webp', true),
      load('home/sky.png', false),
      load('home/drawing.webp', false),
      load('home2/base.webp', true),
      load('home2/real.webp', true),
      load('home2/light-path.webp', true),
      load('home2/light-stone.webp', true),
      load('home2/light-eave.webp', true),
      load('home2/light-holiday.webp', true),
      load('home2/holiday-map.png', false, true),
      load('home2/tier-map.png', false),
    ])
      .then((t) => {
        if (!alive) return;
        const keys = ['tDay', 'tSky', 'tDraw', 'tBase', 'tReal', 'tPath', 'tStone', 'tEave', 'tHol', 'tMap', 'tTier'] as const;
        keys.forEach((k, i) => (uniforms[k].value = t[i]));
        raf = requestAnimationFrame(frame);
        window.dispatchEvent(new Event('regent:ready'));
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
      window.removeEventListener('regent:weather-off', onWeatherOff);
      window.removeEventListener('regent:tier', onTier);
      gsap.killTweensOf(uniforms.uIntro);
      stop();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />;
}

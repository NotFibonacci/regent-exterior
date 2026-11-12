// One material for every surface of the maquette. All lighting is analytic:
// cone fixtures, the visitor's light, a cool moon rim and sky ambient.
// No three.js lights are used, so cost is fixed and predictable.

export const MAX_LIGHTS = 16;

export const KIND = {
  plaster: 0,
  stone: 1,
  siding: 2,
  roof: 3,
  slate: 4,
  glass: 5,
  trim: 6,
  door: 7,
  foliage: 8,
  path: 9,
} as const;

export const surfaceVertex = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const surfaceFragment = /* glsl */ `
#define NL ${MAX_LIGHTS}
uniform vec3 uLPos[NL];
uniform vec3 uLDir[NL];
uniform float uLCos[NL];
uniform float uLInt[NL];
uniform vec3 uCur;
uniform float uCurInt;
uniform float uNight;
uniform float uHoliday;
uniform vec3 uMoonDir;
uniform int uKind;
uniform float uBrass;
varying vec3 vP;
varying vec3 vN;

const vec3 LAMP = vec3(1.0, 0.40, 0.10);   // #FFA957 in linear light
const vec3 MOON = vec3(0.62, 0.71, 0.85);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

// Fades relief out once a course is smaller than a couple of pixels, so
// distant siding and shingles go smooth instead of shimmering.
float lod(float c) { return 1.0 - smoothstep(0.12, 0.36, fwidth(c)); }

// Coursed stone: rows of uneven blocks, each row offset. Returns height
// (0 in the mortar joint) and a per-block id for tonal variation.
float stoneH(vec2 uv, out float id) {
  float rh = 0.26;
  float row = floor(uv.y / rh);
  float w = 0.40 + 0.26 * hash(vec2(row, 3.0));
  float x = uv.x / w + hash(vec2(row, 7.0)) * 0.7;
  id = hash(vec2(floor(x), row));
  vec2 f = vec2(fract(x) * w, fract(uv.y / rh) * rh);
  vec2 d = min(f, vec2(w, rh) - f);
  return smoothstep(0.0, 0.045, min(d.x, d.y)) * (0.7 + 0.3 * id);
}

// Lap siding: each board is proud at its bottom edge and falls back toward
// the top, so a light from below catches every lap.
float sidingH(vec2 uv) {
  float f = fract(uv.y / 0.19);
  return (1.0 - f) * smoothstep(0.0, 0.07, f);
}

float shingleH(vec2 uv, out float id) {
  float rh = 0.21;
  float row = floor(uv.y / rh);
  float x = uv.x / 0.32 + hash(vec2(row, 1.0));
  id = hash(vec2(floor(x), row));
  float f = fract(uv.y / rh);
  float lap = (1.0 - f) * smoothstep(0.0, 0.08, f);
  float fx = fract(x);
  float cut = smoothstep(0.0, 0.06, min(fx, 1.0 - fx));
  return lap * (0.75 + 0.25 * cut) + id * 0.12;
}

void main() {
  vec3 P = vP;
  vec3 Ng = normalize(vN);

  // Surface coordinates: u runs along the wall, v up it (or down the slope for roofs).
  vec3 T = abs(Ng.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), Ng));
  vec2 uv = vec2(dot(P, T), P.y);
  if (abs(Ng.y) > 0.99) uv = P.xz;

  vec3 albedo = vec3(0.80, 0.78, 0.74);
  float h = 0.0;
  float bump = 0.0;
  float id = 0.5;
  vec3 lap = vec3(0.0);   // x: course coordinate, y: face tilt, z: edge width
  vec3 run = vec3(0.0);   // direction the courses stack in

  if (uKind == 1) {
    h = stoneH(uv, id);
    albedo = mix(vec3(0.62, 0.59, 0.54), vec3(0.84, 0.81, 0.75), id);
    albedo *= 0.78 + 0.22 * smoothstep(0.0, 0.4, h);
    bump = 0.045 * lod(uv.y / 0.26);
  } else if (uKind == 2) {
    albedo = vec3(0.74, 0.73, 0.70);
    lap = vec3(uv.y / 0.19, 0.14, 0.09);
    run = vec3(0.0, 1.0, 0.0);
  } else if (uKind == 3) {
    uv.y = P.y / max(sqrt(1.0 - Ng.y * Ng.y), 0.25);
    shingleH(uv, id);
    albedo = vec3(0.30, 0.29, 0.28) * (0.85 + 0.3 * id);
    lap = vec3(uv.y / 0.21, 0.10, 0.10);
    run = normalize(vec3(0.0, 1.0, 0.0) - Ng * Ng.y);
  } else if (uKind == 4) {
    h = vnoise(uv * 2.4) * 0.5 + vnoise(uv * 17.0) * 0.2;
    albedo = vec3(0.085, 0.088, 0.096) * (0.9 + 0.2 * vnoise(uv * 0.9));
    bump = 0.008;
  } else if (uKind == 5) {
    albedo = vec3(0.015, 0.017, 0.022);
  } else if (uKind == 6) {
    albedo = mix(vec3(0.86, 0.84, 0.80), vec3(0.58, 0.30, 0.05), uBrass);
  } else if (uKind == 7) {
    albedo = vec3(0.10, 0.09, 0.085);
    h = step(0.08, abs(fract(uv.x * 2.0) - 0.5)) * 0.5;
    bump = 0.01;
  } else if (uKind == 8) {
    h = vnoise(P.xy * 9.0 + P.z * 6.0) + 0.5 * vnoise(P.zy * 19.0);
    albedo = vec3(0.50, 0.51, 0.46) * (0.85 + 0.3 * vnoise(P.xy * 9.0 + P.z * 6.0));
    bump = 0.008;
  } else if (uKind == 9) {
    h = vnoise(uv * 5.0) * 0.5;
    albedo = vec3(0.34, 0.33, 0.31);
    bump = 0.01;
  } else {
    h = vnoise(uv * 13.0) * 0.5 + vnoise(uv * 41.0) * 0.2;
    bump = 0.006;
  }

  // Bump from a height field using screen-space derivatives (Mikkelsen):
  // builds the surface gradient without needing tangents on the geometry.
  vec3 N = Ng;
  if (bump > 0.0) {
    vec3 dpx = dFdx(P), dpy = dFdy(P);
    float dhx = dFdx(h), dhy = dFdy(h);
    vec3 r1 = cross(dpy, Ng), r2 = cross(Ng, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    N = normalize(abs(det) * Ng - bump * grad);
  }

  // Lapped courses (siding, shingles) get an exact normal instead of a
  // derivative bump: each face leans back, and the thin underside of every
  // lap faces down the run, which is what an uplight catches. The edge is
  // widened to pixel size and faded with distance so it never aliases.
  if (lap.y > 0.0) {
    float f = fract(lap.x);
    float keep = lod(lap.x);
    float edge = (1.0 - smoothstep(0.0, max(lap.z, fwidth(lap.x) * 2.5), f)) * keep;
    N = normalize(mix(normalize(Ng + run * lap.y), normalize(Ng * 0.45 - run), edge));
    albedo *= 1.0 - 0.18 * edge;
  }

  vec3 V = normalize(cameraPosition - P);
  vec3 col = vec3(0.0);

  // Sky: blue hour falling to near-black.
  vec3 sky = mix(vec3(0.060, 0.085, 0.170), vec3(0.014, 0.020, 0.042), uNight);
  col += albedo * sky * (0.30 + 0.70 * (0.5 + 0.5 * N.y));
  // Last warm light from the western horizon, gone by nightfall.
  col += albedo * vec3(0.60, 0.30, 0.12) * (1.0 - uNight) * 0.22 * max(dot(N, normalize(vec3(-0.75, 0.12, 0.55))), 0.0);
  // Moon as a cool rim only.
  col += albedo * MOON * max(dot(N, uMoonDir), 0.0) * mix(0.05, 0.10, uNight);

  float spec = 0.0;
  float gloss = uKind == 5 ? 1.0 : (uKind == 6 ? uBrass : 0.0);

  for (int i = 0; i < NL; i++) {
    float I = uLInt[i];
    if (I <= 0.0) continue;
    vec3 L = uLPos[i] - P;
    float d2 = dot(L, L);
    L *= inversesqrt(d2);
    float c = uLCos[i];
    float spot = smoothstep(c, mix(c, 1.0, 0.6), dot(-L, uLDir[i]));
    float att = 1.0 / (1.0 + 0.11 * d2);
    col += albedo * LAMP * I * spot * att * pow(max(dot(N, L), 0.0), 0.8);
    spec += I * spot * att * pow(max(dot(N, normalize(L + V)), 0.0), 60.0);
  }

  // The visitor's light: a bare warm point, soft falloff, slight wrap so
  // it grazes relief instead of cutting it off.
  {
    vec3 L = uCur - P;
    float d2 = dot(L, L);
    L *= inversesqrt(d2);
    float att = 1.0 / (1.0 + 0.75 * d2);
    float nl = max((dot(N, L) + 0.12) / 1.12, 0.0);
    col += albedo * LAMP * uCurInt * att * nl;
    spec += uCurInt * att * pow(max(dot(N, normalize(L + V)), 0.0), 90.0);
  }

  // Holiday state: a low warm spill near the roofline from the string lights.
  col += albedo * LAMP * uHoliday * 0.10 * smoothstep(1.8, 5.2, P.y);

  if (uKind == 5) {
    // Lived-in windows: a faint interior glow that rises with nightfall.
    // Some rooms are lit, some are not.
    float room = smoothstep(0.42, 0.58, vnoise(vec2(P.x * 0.55 + P.z * 0.9, P.y * 0.45) + 4.0));
    col += LAMP * (0.012 + (0.02 + 0.16 * uNight) * room) * (0.7 + 0.3 * vnoise(uv * 2.3));
    col += MOON * 0.05 * pow(max(dot(reflect(-V, N), uMoonDir), 0.0), 24.0);
  }
  col += LAMP * spec * gloss * 0.6;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Dither: breaks up banding in the long dark gradients.
  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
}
`;

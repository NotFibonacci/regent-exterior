// One material for every surface of the house model. All lighting is
// analytic: cone fixtures, the visitor's light (with a shadow map), a cool
// moon rim and sky ambient. No three.js lights are used, so cost is fixed.

export const MAX_LIGHTS = 16;

export const KIND = {
  trimFlat: 0,
  stone: 1,
  siding: 2,
  roof: 3,
  lawn: 4,
  glass: 5,
  trim: 6, // white trim and gutters; turns to brass on the Gutters page
  dark: 7, // door, shutters, ironwork
  foliage: 8,
  path: 9,
  bark: 10,
  mulch: 11,
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
uniform mat4 uShadowVP;
uniform sampler2D uShadowMap;
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

// Coursed fieldstone. Joints along a course are pushed around by noise so
// no two stones are the same width. Returns height (0 in the mortar) and
// two ids per stone for color.
float stoneH(vec2 uv, float rh, out vec2 id) {
  float row = floor(uv.y / rh);
  float x = uv.x / (rh * 2.3) + hash(vec2(row, 7.0)) * 5.0;
  x += 0.42 * vnoise(vec2(x * 0.9, row * 3.7));
  float col = floor(x);
  id = vec2(hash(vec2(col, row)), hash(vec2(row + 31.0, col)));
  float fx = fract(x), fy = fract(uv.y / rh);
  float e = min(min(fx, 1.0 - fx) * 2.3, min(fy, 1.0 - fy)) * rh;
  return smoothstep(0.0, 0.028, e);
}

float sdRect(vec2 p, vec2 c, vec2 h) {
  vec2 d = abs(p - c) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// The visitor's light casts real shadows: a depth map rendered from the
// light, sampled with a 3x3 filter. Outside the map's view the light is
// too weak to matter, so those points read as unshadowed.
float curShadow(vec3 P, vec3 N) {
  vec4 sc = uShadowVP * vec4(P + N * 0.035, 1.0);
  if (sc.w <= 0.0) return 1.0;
  vec3 s = sc.xyz / sc.w * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float lit = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float d = texture2D(uShadowMap, s.xy + vec2(float(x), float(y)) * (1.4 / 1024.0)).r;
      lit += step(s.z - 0.0007, d);
    }
  }
  return lit / 9.0;
}

void main() {
  vec3 P = vP;
  vec3 Ng = normalize(vN);

  // Surface coordinates: u runs along the wall, v up it (or down the slope for roofs).
  bool flatUp = abs(Ng.y) > 0.99;
  vec3 T = flatUp ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), Ng));
  vec2 uv = flatUp ? P.xz : vec2(dot(P, T), P.y);

  vec3 albedo = vec3(0.80, 0.79, 0.76);
  float h = 0.0;
  float bump = 0.0;
  float wrap = 0.0;
  vec2 id = vec2(0.5);
  vec3 lap = vec3(0.0);   // x: course coordinate, y: face tilt, z: edge width
  vec3 run = vec3(0.0);   // direction the courses stack in

  if (uKind == 1) {
    float m = stoneH(uv, 0.17, id);
    vec3 tan_ = vec3(0.50, 0.41, 0.30), gray = vec3(0.40, 0.39, 0.37), pale = vec3(0.62, 0.57, 0.48), rust = vec3(0.42, 0.29, 0.20);
    vec3 c = mix(tan_, gray, smoothstep(0.25, 0.6, id.x));
    c = mix(c, pale, smoothstep(0.72, 0.9, id.y));
    c = mix(c, rust, smoothstep(0.86, 0.98, id.x) * 0.8);
    float grain = vnoise(uv * 34.0) * 0.6 + vnoise(uv * 90.0) * 0.4;
    albedo = mix(vec3(0.34, 0.33, 0.31), c * (0.8 + 0.35 * grain), m);
    h = m * (0.55 + 0.45 * id.y) + grain * 0.16 * m;
    // Far away, individual stones resolve to their average tone.
    float near = lod(uv.y / 0.17);
    albedo = mix(vec3(0.43, 0.385, 0.32), albedo, near);
    bump = 0.05 * near;
  } else if (uKind == 2) {
    albedo = vec3(0.150, 0.158, 0.170) * (0.92 + 0.16 * vnoise(vec2(uv.x * 0.7, floor(uv.y / 0.14) * 3.1)));
    lap = vec3(uv.y / 0.14, 0.12, 0.10);
    run = vec3(0.0, 1.0, 0.0);
  } else if (uKind == 3) {
    uv.y = P.y / max(sqrt(1.0 - Ng.y * Ng.y), 0.25);
    float row = floor(uv.y / 0.16);
    float tab = floor(uv.x / 0.30 + hash(vec2(row, 1.0)));
    float tone = hash(vec2(tab, row));
    albedo = vec3(0.060, 0.062, 0.068) * (0.75 + 0.6 * tone) * (0.9 + 0.2 * vnoise(uv * 40.0));
    lap = vec3(uv.y / 0.16, 0.09, 0.12);
    run = normalize(vec3(0.0, 1.0, 0.0) - Ng * Ng.y);
  } else if (uKind == 4) {
    float far = lod(uv.x * 14.0);
    float blades = vnoise(uv * vec2(70.0, 55.0)) * 0.6 + vnoise(uv * 23.0) * 0.4;
    float patchy = vnoise(uv * 0.55) * 0.6 + vnoise(uv * 2.3) * 0.4;
    albedo = mix(vec3(0.020, 0.040, 0.014), vec3(0.046, 0.078, 0.026), patchy) * (0.75 + 0.5 * mix(0.5, blades, far));
    h = blades;
    bump = 0.012 * far;
    wrap = 0.25;
  } else if (uKind == 5) {
    albedo = vec3(0.012, 0.014, 0.018);
  } else if (uKind == 6) {
    albedo = mix(vec3(0.80, 0.79, 0.76), vec3(0.58, 0.30, 0.05), uBrass);
  } else if (uKind == 7) {
    albedo = vec3(0.030, 0.030, 0.032);
  } else if (uKind == 8) {
    float leaf = vnoise(P.xy * 26.0 + P.z * 17.0) * 0.6 + vnoise(P.zy * 61.0 + P.x * 23.0) * 0.4;
    albedo = mix(vec3(0.020, 0.045, 0.016), vec3(0.060, 0.105, 0.034), leaf);
    h = leaf;
    bump = 0.02 * lod(P.x * 12.0);
    wrap = 0.45;
  } else if (uKind == 9) {
    float m = stoneH(uv * 0.42, 0.17, id);
    albedo = mix(vec3(0.12, 0.115, 0.11), vec3(0.34, 0.33, 0.31) * (0.75 + 0.4 * id.x), m) * (0.9 + 0.2 * vnoise(uv * 30.0));
    h = m;
    bump = 0.018 * lod(uv.y / 0.4);
  } else if (uKind == 10) {
    albedo = vec3(0.115, 0.092, 0.075) * (0.8 + 0.4 * vnoise(vec2(uv.x * 40.0, uv.y * 6.0)));
    wrap = 0.3;
  } else if (uKind == 11) {
    h = vnoise(uv * 38.0) * 0.6 + vnoise(uv * 90.0) * 0.4;
    albedo = vec3(0.060, 0.038, 0.026) * (0.6 + 0.8 * h);
    bump = 0.02 * lod(uv.x * 20.0);
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
    albedo *= 1.0 - 0.25 * edge;
  }

  // Grounding: surfaces darken where they meet the house, and walls where
  // they meet the ground. Cheap, and it is most of what makes a model sit.
  float ao = 1.0;
  float houseD = min(min(sdRect(P.xz, vec2(0.0, 0.0), vec2(4.0, 3.2)), sdRect(P.xz, vec2(1.9, 3.9), vec2(2.1, 0.7))), sdRect(P.xz, vec2(-6.1, -0.2), vec2(2.1, 2.3)));
  if (uKind == 4 || uKind == 9 || uKind == 11) {
    ao = 0.35 + 0.65 * smoothstep(0.0, 1.6, houseD);
  } else if (!flatUp) {
    ao = 0.6 + 0.4 * smoothstep(0.0, 0.45, P.y);
  }

  vec3 V = normalize(cameraPosition - P);
  vec3 col = vec3(0.0);

  // Sky: blue hour falling to near-black.
  vec3 sky = mix(vec3(0.075, 0.105, 0.210), vec3(0.016, 0.023, 0.048), uNight);
  col += albedo * sky * (0.30 + 0.70 * (0.5 + 0.5 * N.y)) * ao;
  // Last warm light from the western horizon, gone by nightfall.
  col += albedo * vec3(0.60, 0.30, 0.12) * (1.0 - uNight) * 0.30 * max(dot(N, normalize(vec3(-0.75, 0.12, 0.55))), 0.0) * ao;
  // Moon as a cool rim only.
  col += albedo * MOON * max(dot(N, uMoonDir), 0.0) * mix(0.06, 0.13, uNight);

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
    float nl = max((dot(N, L) + wrap) / (1.0 + wrap), 0.0);
    col += albedo * LAMP * I * spot * att * pow(nl, 0.8);
    spec += I * spot * att * pow(max(dot(N, normalize(L + V)), 0.0), 60.0);
  }

  // The visitor's light: a bare warm point with soft falloff and real shadows.
  {
    vec3 L = uCur - P;
    float d2 = dot(L, L);
    L *= inversesqrt(d2);
    float att = 1.0 / (1.0 + 0.5 * d2);
    float nl = max((dot(N, L) + max(wrap, 0.1)) / (1.0 + max(wrap, 0.1)), 0.0);
    float sh = curShadow(P, Ng);
    col += albedo * LAMP * uCurInt * att * nl * sh;
    spec += uCurInt * att * sh * pow(max(dot(N, normalize(L + V)), 0.0), 90.0);
  }

  // Holiday state: a low warm spill near the roofline from the string lights.
  col += albedo * LAMP * uHoliday * 0.16 * smoothstep(1.8, 5.2, P.y) * (1.0 - smoothstep(0.4, 2.0, houseD));

  if (uKind == 5) {
    // Lived-in windows: some rooms lit behind sheer curtains, some dark.
    float room = smoothstep(0.40, 0.56, vnoise(vec2(P.x * 0.55 + P.z * 0.9, P.y * 0.45) + 4.0));
    float curtain = 0.75 + 0.25 * sin(uv.x * 42.0) * sin(uv.x * 13.0 + 1.0);
    col += vec3(1.0, 0.56, 0.22) * (0.010 + (0.03 + 0.30 * uNight) * room * curtain);
    col += mix(vec3(0.05, 0.08, 0.16), vec3(0.01, 0.014, 0.03), uNight) * pow(1.0 - max(dot(N, V), 0.0), 3.0);
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

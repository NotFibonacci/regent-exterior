import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { KIND, MAX_LIGHTS, surfaceFragment, surfaceVertex } from './shaders/surface';
import { skyFragment, skyVertex } from './shaders/sky';
import { haloFragment, haloVertex } from './shaders/halo';

// Fixture groups, in the order the scroll switches them on. The entry
// lantern is not scroll-driven: it comes up with nightfall.
export const GROUP = { path: 0, uplight: 1, wash: 2, eave: 3, holiday: 4, entry: 5 } as const;
export const GROUP_COUNT = 6;

type Fixture = { p: [number, number, number]; d: [number, number, number]; deg: number; power: number; group: number };

const deg = (a: number) => Math.cos((a * Math.PI) / 180);

// Positions are metres; the house faces +Z, wing on the left (-X).
const FIXTURES: Fixture[] = [
  // Path: low, straight down, wide and soft.
  { p: [-1.15, 0.5, 5.3], d: [0, -1, 0], deg: 62, power: 1.6, group: GROUP.path },
  { p: [-3.05, 0.5, 6.9], d: [0, -1, 0], deg: 62, power: 1.6, group: GROUP.path },
  { p: [-1.15, 0.5, 8.5], d: [0, -1, 0], deg: 62, power: 1.6, group: GROUP.path },
  { p: [-3.05, 0.5, 10.1], d: [0, -1, 0], deg: 62, power: 1.6, group: GROUP.path },
  // Uplights: tight beams grazing the stone from its base.
  { p: [0.25, 0.12, 5.05], d: [0, 1, -0.13], deg: 24, power: 6.0, group: GROUP.uplight },
  { p: [3.55, 0.12, 5.05], d: [0, 1, -0.13], deg: 24, power: 6.0, group: GROUP.uplight },
  { p: [-3.45, 0.12, 3.65], d: [0, 1, -0.13], deg: 24, power: 5.5, group: GROUP.uplight },
  { p: [-0.72, 0.12, 3.65], d: [0, 1, -0.13], deg: 24, power: 5.5, group: GROUP.uplight },
  // Wall wash and tree: wider and gentler.
  { p: [-7.35, 0.12, 2.85], d: [0, 1, -0.2], deg: 38, power: 9, group: GROUP.wash },
  { p: [-4.85, 0.12, 2.85], d: [0, 1, -0.2], deg: 38, power: 9, group: GROUP.wash },
  { p: [8.0, 0.12, 2.6], d: [0.1, 1, -0.22], deg: 44, power: 11, group: GROUP.wash },
  // Eaves: downlights tucked under the roofline.
  { p: [1.9, 7.1, 4.86], d: [0, -1, -0.1], deg: 30, power: 10, group: GROUP.eave },
  { p: [-2.1, 5.0, 3.5], d: [0, -1, -0.08], deg: 36, power: 8, group: GROUP.eave },
  { p: [-6.1, 2.55, 2.42], d: [0, -1, -0.08], deg: 42, power: 5, group: GROUP.eave },
  // Entry lantern beside the door.
  { p: [-1.2, 2.15, 3.5], d: [0, -0.55, 0.83], deg: 85, power: 1.5, group: GROUP.entry },
];

export function buildWorld() {
  const root = new THREE.Group();

  // ---- Shared uniforms -------------------------------------------------
  const moonDir = new THREE.Vector3(0.32, 0.56, -0.76).normalize();
  const lPos = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3());
  const lDir = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3(0, -1, 0));
  const lCos = new Array<number>(MAX_LIGHTS).fill(1);
  const lInt = new Array<number>(MAX_LIGHTS).fill(0);
  FIXTURES.forEach((f, i) => {
    lPos[i].set(...f.p);
    lDir[i].set(...f.d).normalize();
    lCos[i] = deg(f.deg);
  });

  const shared = {
    uLPos: { value: lPos },
    uLDir: { value: lDir },
    uLCos: { value: lCos },
    uLInt: { value: lInt },
    uCur: { value: new THREE.Vector3(-2, 2.6, 6.4) },
    uCurInt: { value: 0 },
    uShadowVP: { value: new THREE.Matrix4() },
    uShadowMap: { value: null as THREE.Texture | null },
    uNight: { value: 0 },
    uHoliday: { value: 0 },
    uMoonDir: { value: moonDir },
  };

  const mats = new Map<number, THREE.ShaderMaterial>();
  const mat = (kind: number) => {
    let m = mats.get(kind);
    if (!m) {
      m = new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        uniforms: { ...shared, uKind: { value: kind }, uBrass: { value: 0 } },
      });
      mats.set(kind, m);
    }
    return m;
  };

  const box = (kind: number, w: number, h: number, d: number, x: number, y: number, z: number, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(kind));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // Triangular gable infill: span along X, extruded along Z.
  const gable = (kind: number, span: number, rise: number, depth: number) => {
    const s = new THREE.Shape();
    s.moveTo(-span / 2, 0);
    s.lineTo(span / 2, 0);
    s.lineTo(0, rise);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return new THREE.Mesh(g, mat(kind));
  };

  // Gable roof as two slabs with real thickness and overhang, each edged
  // with a white fascia at the eave and rake boards at the gable ends.
  // Ridge runs along local Z; rotate the group to run it along X.
  const roof = (span: number, rise: number, length: number, over = 0.38) => {
    const g = new THREE.Group();
    const a = Math.atan2(rise, span / 2);
    const slope = Math.hypot(span / 2, rise) + over;
    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.1, length), mat(KIND.roof));
      // Center of the slab sits halfway between ridge and the extended eave.
      slab.position.set((side * (span / 2 + over * Math.cos(a))) / 2, (rise - over * Math.sin(a)) / 2 + 0.09, 0);
      slab.rotation.z = -side * a;
      box(KIND.trim, 0.05, 0.2, length, (side * slope) / 2, -0.06, 0, slab);
      box(KIND.trim, slope, 0.2, 0.05, 0, -0.08, length / 2 - 0.025, slab);
      box(KIND.trim, slope, 0.2, 0.05, 0, -0.08, -length / 2 + 0.025, slab);
      g.add(slab);
    }
    box(KIND.roof, 0.24, 0.07, length + 0.02, 0, rise + 0.15, 0, g);
    return g;
  };

  const windowAt = (x: number, y: number, z: number, w: number, h: number, o: { ry?: number; cols?: number; rows?: number; shutters?: boolean } = {}) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = o.ry ?? 0;
    const cols = o.cols ?? 2;
    const rows = o.rows ?? 3;
    box(KIND.trim, w + 0.22, h + 0.22, 0.07, 0, 0, 0.03, g);
    box(KIND.glass, w, h, 0.05, 0, 0, 0.06, g);
    for (let c = 1; c < cols; c++) box(KIND.trim, 0.028, h, 0.03, -w / 2 + (w * c) / cols, 0, 0.09, g);
    for (let r = 1; r < rows; r++) box(KIND.trim, w, r === Math.round(rows / 2) ? 0.05 : 0.028, 0.03, 0, -h / 2 + (h * r) / rows, 0.09, g);
    box(KIND.trim, w + 0.36, 0.07, 0.16, 0, -h / 2 - 0.14, 0.08, g);
    box(KIND.trim, w + 0.34, 0.1, 0.12, 0, h / 2 + 0.16, 0.06, g);
    if (o.shutters) {
      for (const s of [-1, 1]) {
        box(KIND.dark, 0.36, h + 0.1, 0.05, s * (w / 2 + 0.32), 0, 0.03, g);
      }
    }
    root.add(g);
  };

  // ---- Ground ------------------------------------------------------------
  box(KIND.lawn, 160, 0.8, 150, -1, -0.4, 20);
  box(KIND.path, 1.5, 0.05, 7.0, -2.1, 0.02, 7.7);
  box(KIND.mulch, 4.3, 0.06, 1.3, -6.1, 0.03, 2.7);
  box(KIND.mulch, 4.9, 0.06, 1.2, 2.2, 0.03, 5.15);
  box(KIND.mulch, 1.5, 0.06, 1.3, -0.6, 0.03, 3.85);
  box(KIND.mulch, 1.0, 0.06, 1.3, -3.5, 0.03, 3.85);

  // ---- Main block (two stories: stone below, siding above) ---------------
  box(KIND.stone, 8, 2.8, 6.4, 0, 1.4, 0);
  box(KIND.siding, 8, 2.6, 6.4, 0, 4.1, 0);
  box(KIND.trim, 8.1, 0.1, 6.5, 0, 2.82, 0);
  for (const sx of [-1, 1]) {
    const g = gable(KIND.siding, 6.4, 2.7, 0.2);
    g.rotation.y = Math.PI / 2;
    g.position.set(sx * 3.9, 5.4, 0);
    root.add(g);
    box(KIND.trim, 0.14, 2.52, 0.14, sx * 4.0, 4.13, 3.2);
  }
  box(KIND.trim, 3.9, 0.22, 0.06, -2.15, 5.27, 3.23);
  const mainRoof = roof(6.4, 2.7, 8.8);
  mainRoof.rotation.y = Math.PI / 2;
  mainRoof.position.set(0, 5.4, 0);
  root.add(mainRoof);

  // ---- Front gable projection --------------------------------------------
  box(KIND.stone, 4.2, 2.8, 1.4, 1.9, 1.4, 3.9);
  box(KIND.siding, 4.2, 2.6, 1.4, 1.9, 4.1, 3.9);
  box(KIND.trim, 4.3, 0.1, 1.5, 1.9, 2.82, 3.9);
  box(KIND.trim, 0.14, 2.52, 0.14, -0.2, 4.13, 4.6);
  box(KIND.trim, 0.14, 2.52, 0.14, 4.0, 4.13, 4.6);
  const fg = gable(KIND.siding, 4.2, 2.3, 0.2);
  fg.position.set(1.9, 5.4, 4.5);
  root.add(fg);
  box(KIND.dark, 0.5, 0.7, 0.04, 1.9, 6.45, 4.62);
  box(KIND.trim, 0.62, 0.82, 0.03, 1.9, 6.45, 4.605);
  const frontRoof = roof(4.2, 2.3, 4.3);
  frontRoof.position.set(1.9, 5.4, 2.83);
  root.add(frontRoof);

  // ---- Side wing -----------------------------------------------------------
  box(KIND.stone, 4.2, 0.5, 4.6, -6.1, 0.25, -0.2);
  box(KIND.siding, 4.18, 2.4, 4.58, -6.1, 1.7, -0.2);
  box(KIND.trim, 0.14, 2.4, 0.14, -8.2, 1.7, 2.1);
  box(KIND.trim, 4.2, 0.2, 0.06, -6.1, 2.78, 2.12);
  const wg = gable(KIND.siding, 4.6, 1.8, 0.2);
  wg.rotation.y = Math.PI / 2;
  wg.position.set(-8.1, 2.9, -0.2);
  root.add(wg);
  const wingRoof = roof(4.6, 1.8, 4.7);
  wingRoof.rotation.y = Math.PI / 2;
  wingRoof.position.set(-6.3, 2.9, -0.2);
  root.add(wingRoof);

  // ---- Chimney ---------------------------------------------------------------
  box(KIND.stone, 0.95, 8.8, 0.95, -1.6, 4.4, -0.9);
  box(KIND.trim, 1.12, 0.12, 1.12, -1.6, 8.86, -0.9);
  box(KIND.dark, 0.6, 0.3, 0.6, -1.6, 9.05, -0.9);

  // ---- Entry ---------------------------------------------------------------------
  box(KIND.dark, 1.0, 2.1, 0.08, -2.1, 1.35, 3.24);
  for (const [px, py] of [[-0.24, 0.52], [0.24, 0.52], [-0.24, -0.45], [0.24, -0.45]] as const) box(KIND.dark, 0.34, py > 0 ? 0.75 : 0.8, 0.03, -2.1 + px, 1.35 + py, 3.285);
  box(KIND.glass, 1.0, 0.32, 0.05, -2.1, 2.6, 3.24);
  box(KIND.trim, 0.2, 2.62, 0.16, -2.74, 1.55, 3.28);
  box(KIND.trim, 0.2, 2.62, 0.16, -1.46, 1.55, 3.28);
  box(KIND.trim, 1.75, 0.24, 0.22, -2.1, 2.92, 3.3);
  box(KIND.trim, 1.95, 0.08, 0.34, -2.1, 3.08, 3.34);
  box(KIND.path, 2.0, 0.1, 0.5, -2.1, 0.25, 3.45);
  box(KIND.path, 2.2, 0.1, 0.5, -2.1, 0.15, 3.8);
  box(KIND.path, 2.4, 0.1, 0.5, -2.1, 0.05, 4.15);
  for (const s of [-1, 1]) {
    box(KIND.dark, 0.04, 0.95, 0.04, -2.1 + s * 1.12, 0.6, 4.3);
    box(KIND.dark, 0.04, 0.95, 0.04, -2.1 + s * 0.98, 0.78, 3.4);
    const rail = box(KIND.dark, 0.04, 0.04, 0.95, -2.1 + s * 1.05, 1.16, 3.85);
    rail.rotation.x = 0.2;
  }
  box(KIND.dark, 0.14, 0.26, 0.14, -1.2, 2.2, 3.3);

  // ---- Windows -------------------------------------------------------------------
  windowAt(-3.15, 4.15, 3.2, 0.85, 1.3, { shutters: true });
  windowAt(-1.05, 4.15, 3.2, 0.85, 1.3, { shutters: true });
  windowAt(1.9, 1.5, 4.6, 1.5, 1.45, { cols: 3 });
  windowAt(1.9, 4.2, 4.6, 1.0, 1.35, { shutters: true });
  windowAt(-7.05, 1.65, 2.1, 0.85, 1.3, { shutters: true });
  windowAt(-5.15, 1.65, 2.1, 0.85, 1.3, { shutters: true });
  windowAt(-8.2, 1.65, -0.2, 0.85, 1.3, { ry: -Math.PI / 2 });
  windowAt(-4.0, 4.15, 0.6, 0.85, 1.3, { ry: -Math.PI / 2 });

  // ---- Gutters and downspouts (white for now; brass on the Gutters page) ----
  box(KIND.trim, 4.25, 0.13, 0.15, -2.3, 5.1, 3.6);
  box(KIND.trim, 0.09, 5.05, 0.09, -0.32, 2.53, 3.3);
  box(KIND.trim, 4.7, 0.13, 0.15, -6.3, 2.6, 2.5);
  box(KIND.trim, 0.09, 2.56, 0.09, -8.08, 1.28, 2.22);

  // ---- Planting ------------------------------------------------------------------
  // Lumpy clipped forms: a sphere pushed in and out by a few sine octaves.
  const lump = (geo: THREE.BufferGeometry, seed: number, amount: number) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n =
        Math.sin(v.x * 4.1 + seed) * Math.sin(v.y * 3.7 + seed * 1.3) * Math.sin(v.z * 4.3 + seed * 0.7) * 0.6 +
        Math.sin(v.x * 9.3 + seed * 2.1) * Math.sin(v.y * 8.1 + seed) * Math.sin(v.z * 8.7 + seed * 1.9) * 0.4;
      v.multiplyScalar(1 + amount * n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const shrub = (x: number, z: number, r: number, sy: number, seed: number, y = 0) => {
    const g = lump(new THREE.SphereGeometry(r, 28, 18), seed, 0.16);
    g.scale(1.15, sy, 1.0);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(KIND.foliage));
    m.position.set(x, y + r * sy * 0.8, z);
    root.add(m);
  };
  shrub(-7.55, 2.95, 0.62, 0.85, 1);
  shrub(-6.35, 3.0, 0.7, 0.8, 2);
  shrub(-5.1, 2.95, 0.6, 0.9, 3);
  shrub(0.75, 5.3, 0.5, 0.85, 4);
  shrub(3.1, 5.3, 0.52, 0.8, 5);
  shrub(-3.5, 3.95, 0.42, 0.9, 6);
  // Standard (ball on a stem) beside the door.
  box(KIND.bark, 0.08, 1.0, 0.08, -0.6, 0.5, 4.2);
  shrub(-0.6, 4.2, 0.58, 1.0, 7, 0.95);
  // Tall evergreen at the right corner.
  const cone = lump(new THREE.ConeGeometry(0.85, 3.6, 22, 10), 9, 0.12);
  const ever = new THREE.Mesh(cone, mat(KIND.foliage));
  ever.position.set(4.95, 1.8, 4.4);
  root.add(ever);

  // ---- Trees: tapered limbs, bare for the season --------------------------------
  const tree = (x: number, z: number, height: number, seed: number) => {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const parts: THREE.BufferGeometry[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    const grow = (p: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
      const end = p.clone().addScaledVector(dir, len);
      const g = new THREE.CylinderGeometry(r * 0.68, r, len, depth > 3 ? 7 : 4, 1, true);
      g.applyQuaternion(q.setFromUnitVectors(up, dir));
      g.translate((p.x + end.x) / 2, (p.y + end.y) / 2, (p.z + end.z) / 2);
      parts.push(g);
      if (depth === 0) return;
      const n = depth > 4 ? 2 : 2 + (rnd() < 0.45 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const d = dir.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() * 0.45 - 0.05, rnd() - 0.5).multiplyScalar(1.15)).normalize();
        grow(end, d, len * (0.64 + rnd() * 0.16), r * 0.68, depth - 1);
      }
    };
    grow(new THREE.Vector3(x, -0.05, z), new THREE.Vector3(0.04, 1, 0.02).normalize(), height, height * 0.055, 6);
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    if (merged) root.add(new THREE.Mesh(merged, mat(KIND.bark)));
  };
  tree(8.3, 2.0, 3.3, 23);
  tree(-2.5, -8.5, 4.4, 41);
  tree(16.0, -6.5, 4.0, 7);

  // ---- Halos: fixture sources plus holiday string lights --------------------------
  const hp: number[] = [];
  const hg: number[] = [];
  const hs: number[] = [];
  FIXTURES.forEach((f) => {
    hp.push(...f.p);
    hg.push(f.group);
    hs.push(f.group === GROUP.path ? 0.3 : f.group === GROUP.entry ? 0.42 : 0.4);
  });
  const string = (a: [number, number, number], b: [number, number, number]) => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const n = Math.max(2, Math.round(A.distanceTo(B) / 0.24));
    for (let i = 0; i <= n; i++) {
      const p = A.clone().lerp(B, i / n);
      hp.push(p.x, p.y, p.z);
      hg.push(GROUP.holiday);
      hs.push(0.15);
    }
  };
  string([-4.4, 5.14, 3.68], [-0.3, 5.14, 3.68]);
  string([-0.5, 5.12, 5.0], [1.9, 7.75, 5.0]);
  string([1.9, 7.75, 5.0], [4.3, 5.12, 5.0]);
  string([-8.65, 2.66, 2.58], [-4.05, 2.66, 2.58]);
  string([-8.7, 2.66, 2.4], [-8.7, 4.75, -0.2]);
  string([-2.9, 3.16, 3.5], [-1.3, 3.16, 3.5]);

  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  haloGeo.setAttribute('aGroup', new THREE.Float32BufferAttribute(hg, 1));
  haloGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(hs, 1));
  const haloUniforms = { uG: { value: new Array<number>(GROUP_COUNT).fill(0) }, uPx: { value: 1000 } };
  const halos = new THREE.Points(
    haloGeo,
    new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: haloUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halos.frustumCulled = false;
  root.add(halos);

  // ---- Sky ------------------------------------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: { uNight: shared.uNight, uMoonDir: shared.uMoonDir },
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  root.add(sky);

  return { root, shared, haloUniforms, fixtures: FIXTURES, sky, halos };
}

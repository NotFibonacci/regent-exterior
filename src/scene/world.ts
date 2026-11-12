import * as THREE from 'three';
import { KIND, MAX_LIGHTS, surfaceFragment, surfaceVertex } from './shaders/surface';
import { skyFragment, skyVertex } from './shaders/sky';
import { haloFragment, haloVertex } from './shaders/halo';

// Fixture groups, in the order the scroll switches them on.
export const GROUP = { path: 0, uplight: 1, wash: 2, eave: 3, holiday: 4 } as const;

type Fixture = { p: [number, number, number]; d: [number, number, number]; deg: number; power: number; group: number };

const deg = (a: number) => Math.cos((a * Math.PI) / 180);

// Positions are metres; the house faces +Z, wing on the left (-X).
const FIXTURES: Fixture[] = [
  // Path: low, straight down, wide and soft.
  { p: [-1.15, 0.5, 5.3], d: [0, -1, 0], deg: 62, power: 1.1, group: GROUP.path },
  { p: [-3.05, 0.5, 6.9], d: [0, -1, 0], deg: 62, power: 1.1, group: GROUP.path },
  { p: [-1.15, 0.5, 8.5], d: [0, -1, 0], deg: 62, power: 1.1, group: GROUP.path },
  { p: [-3.05, 0.5, 10.1], d: [0, -1, 0], deg: 62, power: 1.1, group: GROUP.path },
  // Uplights: tight beams grazing the stone from its base.
  { p: [0.2, 0.12, 5.02], d: [0, 1, -0.13], deg: 24, power: 4.2, group: GROUP.uplight },
  { p: [3.6, 0.12, 5.02], d: [0, 1, -0.13], deg: 24, power: 4.2, group: GROUP.uplight },
  { p: [-3.45, 0.12, 3.62], d: [0, 1, -0.13], deg: 24, power: 3.8, group: GROUP.uplight },
  { p: [-0.72, 0.12, 3.62], d: [0, 1, -0.13], deg: 24, power: 3.8, group: GROUP.uplight },
  // Wall wash: wider and gentler across siding.
  { p: [-7.35, 0.12, 2.8], d: [0, 1, -0.2], deg: 38, power: 2.2, group: GROUP.wash },
  { p: [-4.85, 0.12, 2.8], d: [0, 1, -0.2], deg: 38, power: 2.2, group: GROUP.wash },
  { p: [4.75, 0.12, 3.9], d: [-0.2, 1, 0], deg: 38, power: 2.2, group: GROUP.wash },
  // Eaves: downlights tucked under the roofline.
  { p: [1.9, 7.15, 4.86], d: [0, -1, -0.1], deg: 30, power: 3.0, group: GROUP.eave },
  { p: [-2.1, 5.0, 3.5], d: [0, -1, -0.08], deg: 36, power: 2.2, group: GROUP.eave },
  { p: [-6.1, 2.55, 2.42], d: [0, -1, -0.08], deg: 42, power: 1.6, group: GROUP.eave },
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
    uCur: { value: new THREE.Vector3(-2, 2.6, 5.5) },
    uCurInt: { value: 0 },
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

  // Gable roof as two slabs with real thickness and overhang. Ridge runs
  // along local Z; rotate the returned group to run it along X.
  const roof = (span: number, rise: number, length: number, over = 0.35) => {
    const g = new THREE.Group();
    const a = Math.atan2(rise, span / 2);
    const slope = Math.hypot(span / 2, rise) + over;
    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.12, length), mat(KIND.roof));
      // Centre of the slab sits halfway between ridge and the extended eave.
      slab.position.set((side * (span / 2 + over * Math.cos(a))) / 2, (rise - over * Math.sin(a)) / 2 + 0.07, 0);
      slab.rotation.z = -side * a;
      g.add(slab);
    }
    return g;
  };

  const windowAt = (x: number, y: number, z: number, w: number, h: number, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    box(KIND.trim, w + 0.24, h + 0.24, 0.06, 0, 0, 0.03, g);
    box(KIND.glass, w, h, 0.05, 0, 0, 0.065, g);
    box(KIND.trim, 0.05, h, 0.03, 0, 0, 0.1, g);
    box(KIND.trim, w, 0.05, 0.03, 0, 0, 0.1, g);
    box(KIND.trim, w + 0.4, 0.08, 0.16, 0, -h / 2 - 0.16, 0.08, g);
    root.add(g);
  };

  // ---- Plinth and approach ---------------------------------------------
  box(KIND.slate, 120, 0.8, 110, -1, -0.4, 22);
  box(KIND.path, 1.5, 0.04, 6.9, -2.1, 0.02, 7.55);

  // ---- Main block (two storeys: stone below, siding above) ---------------
  box(KIND.stone, 8, 2.8, 6.4, 0, 1.4, 0);
  box(KIND.siding, 8, 2.6, 6.4, 0, 4.1, 0);
  for (const sx of [-1, 1]) {
    const g = gable(KIND.siding, 6.4, 2.7, 0.2);
    g.rotation.y = Math.PI / 2;
    g.position.set(sx * 3.9, 5.4, 0);
    root.add(g);
  }
  const mainRoof = roof(6.4, 2.7, 8.7);
  mainRoof.rotation.y = Math.PI / 2;
  mainRoof.position.set(0, 5.4, 0);
  root.add(mainRoof);

  // ---- Front gable projection --------------------------------------------
  box(KIND.stone, 4.2, 2.8, 1.4, 1.9, 1.4, 3.9);
  box(KIND.siding, 4.2, 2.6, 1.4, 1.9, 4.1, 3.9);
  const fg = gable(KIND.siding, 4.2, 2.3, 0.2);
  fg.position.set(1.9, 5.4, 4.5);
  root.add(fg);
  const frontRoof = roof(4.2, 2.3, 4.2);
  frontRoof.position.set(1.9, 5.4, 2.85);
  root.add(frontRoof);

  // ---- Side wing -----------------------------------------------------------
  box(KIND.siding, 4.2, 2.9, 4.6, -6.1, 1.45, -0.2);
  const wg = gable(KIND.siding, 4.6, 1.8, 0.2);
  wg.rotation.y = Math.PI / 2;
  wg.position.set(-8.1, 2.9, -0.2);
  root.add(wg);
  const wingRoof = roof(4.6, 1.8, 4.6);
  wingRoof.rotation.y = Math.PI / 2;
  wingRoof.position.set(-6.25, 2.9, -0.2);
  root.add(wingRoof);

  // ---- Chimney ---------------------------------------------------------------
  box(KIND.stone, 0.95, 8.9, 0.95, -1.6, 4.45, -0.9);
  box(KIND.trim, 1.15, 0.14, 1.15, -1.6, 8.95, -0.9);

  // ---- Entry ---------------------------------------------------------------------
  box(KIND.door, 1.0, 2.1, 0.08, -2.1, 1.35, 3.24);
  box(KIND.trim, 0.16, 2.3, 0.14, -2.72, 1.45, 3.27);
  box(KIND.trim, 0.16, 2.3, 0.14, -1.48, 1.45, 3.27);
  box(KIND.trim, 1.7, 0.22, 0.2, -2.1, 2.62, 3.3);
  box(KIND.trim, 1.9, 0.08, 0.3, -2.1, 2.77, 3.33);
  box(KIND.path, 2.0, 0.1, 0.5, -2.1, 0.25, 3.45);
  box(KIND.path, 2.2, 0.1, 0.5, -2.1, 0.15, 3.8);
  box(KIND.path, 2.4, 0.1, 0.5, -2.1, 0.05, 4.15);

  // ---- Windows -------------------------------------------------------------------
  windowAt(-3.15, 4.15, 3.2, 0.85, 1.25);
  windowAt(-1.05, 4.15, 3.2, 0.85, 1.25);
  windowAt(1.9, 1.55, 4.6, 1.35, 1.4);
  windowAt(1.9, 4.2, 4.6, 1.0, 1.3);
  windowAt(-7.05, 1.55, 2.1, 0.85, 1.3);
  windowAt(-5.15, 1.55, 2.1, 0.85, 1.3);
  windowAt(-8.2, 1.55, -0.2, 0.85, 1.3, -Math.PI / 2);

  // ---- Gutters and downspouts (plaster for now; brass on the Gutters page) ----
  box(KIND.trim, 4.2, 0.13, 0.14, -2.3, 5.11, 3.56);
  box(KIND.trim, 0.1, 5.05, 0.1, -0.32, 2.53, 3.3);
  box(KIND.trim, 4.6, 0.13, 0.14, -6.25, 2.62, 2.46);
  box(KIND.trim, 0.1, 2.56, 0.1, -8.05, 1.28, 2.2);

  // ---- Planting: clipped forms, as on an architect's model ---------------------
  const shrub = (x: number, y: number, z: number, r: number) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), mat(KIND.foliage));
    m.position.set(x, y, z);
    root.add(m);
  };
  shrub(-0.55, 1.55, 4.55, 0.72);
  box(KIND.door, 0.09, 0.95, 0.09, -0.55, 0.47, 4.55);
  shrub(1.15, 0.42, 5.35, 0.55);
  shrub(2.65, 0.42, 5.35, 0.55);
  shrub(-7.5, 0.5, 3.05, 0.66);
  shrub(-6.2, 0.5, 3.1, 0.7);
  shrub(-4.95, 0.5, 3.05, 0.62);

  // ---- Wire trees ---------------------------------------------------------------------
  const tree = (x: number, z: number, height: number, seed: number) => {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts: number[] = [];
    const grow = (p: THREE.Vector3, dir: THREE.Vector3, len: number, depth: number) => {
      const q = p.clone().addScaledVector(dir, len);
      pts.push(p.x, p.y, p.z, q.x, q.y, q.z);
      if (depth === 0) return;
      const n = depth > 4 ? 2 : 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const d = dir.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() * 0.5 - 0.08, rnd() - 0.5).multiplyScalar(1.25)).normalize();
        grow(q, d, len * (0.66 + rnd() * 0.16), depth - 1);
      }
    };
    grow(new THREE.Vector3(x, 0, z), new THREE.Vector3(0.05, 1, 0), height, 7);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x0b0a08 })));
  };
  tree(8.2, -4.0, 3.6, 23);
  tree(-2.5, -8.0, 4.2, 41);
  tree(14.5, -7.0, 3.9, 7);

  // ---- Halos: fixture sources plus holiday string lights --------------------------
  const hp: number[] = [];
  const hg: number[] = [];
  const hs: number[] = [];
  FIXTURES.forEach((f) => {
    hp.push(...f.p);
    hg.push(f.group);
    hs.push(f.group === GROUP.path ? 0.34 : 0.46);
  });
  const string = (a: [number, number, number], b: [number, number, number]) => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const n = Math.max(2, Math.round(A.distanceTo(B) / 0.3));
    for (let i = 0; i <= n; i++) {
      const p = A.clone().lerp(B, i / n);
      hp.push(p.x, p.y, p.z);
      hg.push(GROUP.holiday);
      hs.push(0.17);
    }
  };
  string([-4.35, 5.17, 3.6], [-0.3, 5.17, 3.6]);
  string([-0.44, 5.16, 4.97], [1.9, 7.72, 4.97]);
  string([1.9, 7.72, 4.97], [4.24, 5.16, 4.97]);
  string([-8.5, 2.7, 2.5], [-4.1, 2.7, 2.5]);
  string([-8.62, 2.7, 2.38], [-8.62, 4.72, -0.2]);
  string([-2.85, 2.85, 3.42], [-1.35, 2.85, 3.42]);

  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
  haloGeo.setAttribute('aGroup', new THREE.Float32BufferAttribute(hg, 1));
  haloGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(hs, 1));
  const haloUniforms = { uG: { value: [0, 0, 0, 0, 0] }, uPx: { value: 1000 } };
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

  return { root, shared, haloUniforms, fixtures: FIXTURES };
}

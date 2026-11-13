import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, GROUP, GROUP_COUNT } from './world';
import { startTimeline, state } from './timeline';

// Camera keyframes, one per scene section. Dollies only: the camera never
// orbits the house, and rotation between neighbors stays small.
const KEYS: { p: [number, number, number]; t: [number, number, number] }[] = [
  { p: [-14.0, 3.2, 30.0], t: [-1.5, 3.5, 0] }, // dusk: the whole house
  { p: [-9.5, 1.9, 21.0], t: [-2.2, 2.3, 3.0] }, // path: low, along the walk
  { p: [-2.5, 2.4, 20.5], t: [0.2, 3.3, 3.0] }, // architecture: stone and gable
  { p: [-8.5, 5.2, 23.5], t: [-1.2, 4.7, 1.0] }, // eaves: up at the roofline
  { p: [-15.0, 3.6, 33.0], t: [-1.6, 3.7, 0] }, // holiday: back out
];

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

function Rig() {
  const world = useMemo(() => buildWorld(), []);
  const { camera, gl, size } = useThree();
  const pointer = useRef({ x: 0, y: 0, used: false });
  const tgt = useRef(new THREE.Vector3(...KEYS[0].t));
  const cur = useRef(new THREE.Vector3(-2, 2.6, 6.4));
  const announced = useRef(false);
  // Depth map for the visitor's light: the one shadow caster in the scene.
  const shadow = useMemo(() => {
    const px = window.matchMedia('(pointer: coarse)').matches ? 512 : 1024;
    const rt = new THREE.WebGLRenderTarget(px, px, { depthTexture: new THREE.DepthTexture(px, px) });
    const cam = new THREE.PerspectiveCamera(128, 1, 0.3, 45);
    const mat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    return { rt, cam, mat };
  }, []);
  useEffect(() => () => shadow.rt.dispose(), [shadow]);
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), ray: new THREE.Raycaster(), hit: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -6.4), ndc: new THREE.Vector2() }),
    [],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.current.used = true;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
    };
  }, []);

  // Compose the house off-center so the copy has clear sky to sit on:
  // right of the text on wide screens, above it on phones.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1.05;
    cam.setViewOffset(size.width, size.height, wide ? -size.width * 0.17 : 0, wide ? 0 : size.height * 0.15, size.width, size.height);
    return () => cam.clearViewOffset();
  }, [camera, size]);

  useFrame((s, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const d = Math.min(dt, 0.05);

    // Camera.
    const i = Math.min(Math.floor(state.k), KEYS.length - 2);
    const f = smoother(Math.min(Math.max(state.k - i, 0), 1));
    tmp.p.set(...KEYS[i].p).lerp(tmp.t.set(...KEYS[i + 1].p), f);
    const wantT = tmp.t.set(...KEYS[i].t).lerp(tmp.hit.set(...KEYS[i + 1].t), f);
    // Portrait screens see less width, so stand further back.
    const back = aspect < 1 ? 1 + (1 - aspect) * 1.9 : 1;
    tmp.p.sub(wantT).multiplyScalar(back).add(wantT);
    const ease = state.reduced ? 1 : 1 - Math.exp(-d * 3.2);
    cam.position.lerp(tmp.p, ease);
    tgt.current.lerp(wantT, ease);
    cam.lookAt(tgt.current);

    // The visitor's light. Until they move, it drifts on its own so the
    // effect is visible on touch screens before the first tap.
    if (pointer.current.used) {
      tmp.ndc.set(pointer.current.x, pointer.current.y);
      tmp.ray.setFromCamera(tmp.ndc, cam);
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) {
        tmp.hit.x = THREE.MathUtils.clamp(tmp.hit.x, -11, 7);
        tmp.hit.y = THREE.MathUtils.clamp(tmp.hit.y, 0.5, 8.5);
      }
    } else {
      const t = s.clock.elapsedTime;
      tmp.hit.set(-2.2 + Math.sin(t * 0.28) * 4.6, 2.7 + Math.sin(t * 0.43) * 1.3, 6.4);
    }
    cur.current.lerp(tmp.hit, state.reduced ? 1 : 1 - Math.exp(-d * 7));

    // Uniforms.
    const u = world.shared;
    u.uCur.value.copy(cur.current);
    u.uCurInt.value = state.reduced ? 2.4 : 3.4;
    u.uNight.value = state.night;
    u.uHoliday.value = state.groups[GROUP.holiday];
    state.groups[GROUP.entry] = 0.35 + 0.65 * state.night;
    world.fixtures.forEach((fx, n) => (u.uLInt.value[n] = fx.power * state.groups[fx.group]));
    for (let g = 0; g < GROUP_COUNT; g++) world.haloUniforms.uG.value[g] = state.groups[g];

    // Shadow pass: draw the scene's depth from the visitor's light.
    shadow.cam.position.copy(cur.current);
    shadow.cam.lookAt(cur.current.x * 0.8 - 0.4, cur.current.y * 0.8 + 0.4, 0);
    shadow.cam.updateMatrixWorld();
    u.uShadowVP.value.multiplyMatrices(shadow.cam.projectionMatrix, shadow.cam.matrixWorldInverse);
    world.sky.visible = world.halos.visible = false;
    s.scene.overrideMaterial = shadow.mat;
    gl.setRenderTarget(shadow.rt);
    gl.clear();
    gl.render(s.scene, shadow.cam);
    gl.setRenderTarget(null);
    s.scene.overrideMaterial = null;
    world.sky.visible = world.halos.visible = true;
    u.uShadowMap.value = shadow.rt.depthTexture;
    world.haloUniforms.uPx.value = (gl.domElement.height * 0.5) / Math.tan((cam.fov * Math.PI) / 360);

    if (!announced.current) {
      announced.current = true;
      window.dispatchEvent(new Event('regent:ready'));
    }
  });

  return <primitive object={world.root} />;
}

export default function Stage() {
  useEffect(() => startTimeline(), []);
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  return (
    <Canvas
      dpr={[1, coarse ? 1.5 : 1.75]}
      camera={{ fov: 32, near: 0.1, far: 400, position: KEYS[0].p }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 1;
        gl.setClearColor(0x08090b);
      }}
      aria-hidden="true"
    >
      <Rig />
    </Canvas>
  );
}

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Mutable scene state: written by scroll and by the lighting buttons, read
// every frame by the renderer.
export const state = {
  k: 0, // 0: the opening dusk shot, 1: the night scene
  night: 0,
  groups: [0, 0, 0, 0, 0, 0], // path, uplight, wash, eave, holiday, entry lantern
  reduced: false,
};

// What each button on the page switches.
const LAYERS: Record<string, number[]> = {
  path: [0],
  stone: [1],
  siding: [2],
  roofline: [3],
  holiday: [4],
};

export function startTimeline() {
  gsap.registerPlugin(ScrollTrigger);
  state.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lenis: Lenis | undefined;
  let tick: ((t: number) => void) | undefined;
  if (!state.reduced) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    tick = (t: number) => lenis!.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  // The visitor's choices persist; they are only shown while the night
  // scene is on screen.
  const wanted = new Set<string>();
  document.querySelectorAll<HTMLElement>('[data-layer][aria-pressed="true"]').forEach((b) => wanted.add(b.dataset.layer!));
  let showing = false;

  // A lamp warms past full and settles (to 108%, 900ms); it never snaps.
  const drive = (g: number, on: boolean, delay = 0) => {
    gsap.killTweensOf(state.groups, String(g));
    if (state.reduced) state.groups[g] = on ? 1 : 0;
    else if (on) gsap.to(state.groups, { keyframes: [{ [g]: 1.08, duration: 0.55, ease: 'expo.out' }, { [g]: 1, duration: 0.35, ease: 'sine.inOut' }], delay });
    else gsap.to(state.groups, { [g]: 0, duration: 0.5, ease: 'power2.out' });
  };
  const lit = new Set<number>();
  const apply = () => {
    let n = 0;
    for (const [name, groups] of Object.entries(LAYERS)) {
      const on = showing && wanted.has(name);
      groups.forEach((g) => {
        if (on === lit.has(g)) return;
        if (on) lit.add(g);
        else lit.delete(g);
        drive(g, on, on ? n++ * 0.16 : 0);
      });
    }
  };

  const onLights = (ev: Event) => {
    const d = (ev as CustomEvent).detail ?? {};
    if (typeof d.layer !== 'string' || !(d.layer in LAYERS)) return;
    if (d.on) wanted.add(d.layer);
    else wanted.delete(d.layer);
    apply();
  };
  window.addEventListener('regent:lights', onLights);

  const hero = document.querySelector<HTMLElement>('[data-scene="dusk"]');
  const design = document.querySelector<HTMLElement>('[data-scene="design"]');
  const triggers: ScrollTrigger[] = [];
  if (hero && design) {
    triggers.push(
      ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        endTrigger: design,
        end: 'top top',
        onUpdate: (st) => {
          state.k = st.progress;
          state.night = Math.min(1, Math.max(0, (st.progress - 0.15) / 0.55));
          const now = st.progress > 0.72;
          if (now !== showing) {
            showing = now;
            apply();
          }
        },
      }),
    );
  }

  return () => {
    window.removeEventListener('regent:lights', onLights);
    triggers.forEach((t) => t.kill());
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}

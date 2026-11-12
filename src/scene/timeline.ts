import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Mutable scene state: written by scroll, read every frame by the renderer.
export const state = {
  k: 0, // camera keyframe position, 0 .. KEYS.length - 1
  night: 0,
  groups: [0, 0, 0, 0, 0], // path, uplight, wash, eave, holiday
  reduced: false,
};

// Scene section order. Each one switches on the listed fixture groups.
const SECTIONS: { name: string; on: number[] }[] = [
  { name: 'dusk', on: [] },
  { name: 'path', on: [0] },
  { name: 'architecture', on: [1, 2] },
  { name: 'eaves', on: [3] },
  { name: 'holiday', on: [4] },
];

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

  const els = SECTIONS.map((s) => document.querySelector<HTMLElement>(`[data-scene="${s.name}"]`)).filter(Boolean) as HTMLElement[];
  const triggers: ScrollTrigger[] = [];
  if (els.length === SECTIONS.length) {
    // Camera and nightfall follow the scroll position directly.
    triggers.push(
      ScrollTrigger.create({
        trigger: els[0],
        start: 'top top',
        endTrigger: els[els.length - 1],
        end: 'top top',
        onUpdate: (st) => {
          state.k = st.progress * (SECTIONS.length - 1);
          state.night = Math.min(1, state.k / 0.85);
        },
      }),
    );

    // Fixtures are switched, not scrubbed: a lamp warms past full and settles
    // (to 108%, 900ms) no matter how fast the visitor scrolls.
    SECTIONS.forEach((s, i) => {
      if (!s.on.length) return;
      const set = (v: number) => {
        s.on.forEach((g, n) => {
          gsap.killTweensOf(state.groups, String(g));
          if (state.reduced) {
            state.groups[g] = v;
          } else if (v > 0) {
            gsap.to(state.groups, { keyframes: [{ [g]: 1.08, duration: 0.55, ease: 'expo.out' }, { [g]: 1, duration: 0.35, ease: 'sine.inOut' }], delay: n * 0.18 });
          } else {
            gsap.to(state.groups, { [g]: 0, duration: 0.5, ease: 'power2.out' });
          }
        });
      };
      triggers.push(ScrollTrigger.create({ trigger: els[i], start: 'top 45%', onEnter: () => set(1), onLeaveBack: () => set(0) }));
    });
  }

  return () => {
    triggers.forEach((t) => t.kill());
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}

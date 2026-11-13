// Prints estimates for typical jobs: node tools/estimate-check.mjs (after bundling, see below)
import { estimate } from '../src/config/estimate.ts';
const base = { roofline: 150, stories: 2, steep: false, treesSmall: 0, treesMedium: 0, shrubs: 0, wreaths: 0, windows: 0, garland: 0, rush: false };
const jobs = [
  ['150 ft roofline, 2 storeys', {}],
  ['100 ft, 1 storey', { roofline: 100, stories: 1 }],
  ['200 ft, 2 storeys, 4 shrubs, 1 wreath', { roofline: 200, shrubs: 4, wreaths: 1 }],
  ['250 ft, 2 storeys, 2 med trees, 6 shrubs, 50 ft garland', { roofline: 250, treesMedium: 2, shrubs: 6, garland: 50 }],
  ['400 ft, steep, 3 med trees, 10 shrubs, 2 wreaths, 100 ft garland', { roofline: 400, steep: true, treesMedium: 3, shrubs: 10, wreaths: 2, garland: 100 }],
  ['100 ft garland only (per-100ft check)', { roofline: 0, garland: 100 }],
];
const $ = (n) => '$' + Math.round(n).toLocaleString('en-US');
for (const [name, j] of jobs) {
  const row = [name];
  for (const offer of ['single', 'seasonal', 'annual']) {
    const e = estimate({ ...base, ...j, offer });
    row.push(`${offer}: ${$(e.price)} (mat ${$(e.materialCharged)}, lab ${$(e.labor)}, ${e.summary})`);
  }
  console.log(row.join('\n   '));
}

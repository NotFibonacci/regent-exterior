// Holiday lighting estimate rules. Edit numbers here only; the estimator on
// /holiday-lighting/ reads this file. Estimates are always shown as a range
// and confirmed on site.
export const pricing = {
  rooflinePerFoot: 9, // Seasonal Service, per linear foot of roofline
  ridgeUplift: 0.25, // extra on ridge and peak footage
  storyUplift: { 1: 0, 2: 0.2, 3: 0.35 } as Record<number, number>, // on roofline
  steepUplift: 0.35, // 8/12 pitch or steeper, on roofline (replaces storey uplift if higher)
  treeSmall: 250, // under 10 ft
  treeMedium: 600, // 10 to 25 ft; larger trees are quoted on site
  shrub: 75,
  wreath: 100,
  window: 50,
  rushUplift: 0.3, // install inside 5 days
  offers: {
    single: { label: 'Single Install', factor: 1.2, note: 'Installed once; the lights are yours to keep.' },
    seasonal: { label: 'Seasonal Service', factor: 1.0, note: 'Install, in-season maintenance and takedown. Lights leased.' },
    annual: { label: 'Annual Plan', factor: 0.9, note: 'Seasonal Service on a three-year plan, price held. Lights leased.' },
  },
  minimum: 950,
  rangeLow: 0.92,
  rangeHigh: 1.12,
} as const;

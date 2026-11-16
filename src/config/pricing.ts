// Holiday lighting pricing: real material cost + 6% Maryland sales tax +
// labor at the crew's hourly rates, then the markup. Edit numbers here only;
// the estimator on /holiday-lighting/ runs src/config/estimate.ts on them.
// Customers only ever see a range, confirmed on site.

// Hourly labor (company-wide; the skilled-trade rate also applies to
// windows, doors, gutters and siding work when those are priced).
export const rates = {
  lightingLabor: 30, // per laborer-hour, all lighting work (holiday and landscape)
  electrician: 40, // making the power connections (range given: $37.50-$40)
  skilledTrade: 40, // windows, doors, siding, gutters (range given: $37.50-$40)
  salesTax: 0.06, // Maryland, flat statewide, on materials
  markup: 0.48, // on total cost (materials incl. tax + labor)
};

// Material unit costs, from current supplier prices (Nov 2026).
export const materials = {
  c9Bulb: 24.61 / 25, // Minleon C9 warm white SMD LED, 25-pack $24.61
  c9WirePerFoot: 324.95 / 1000, // Novelty Lights C9 SPT-2 10A spool, 1000 ft, 12" spacing, $324.95
  clip: 63.48 / 500, // All-in-One clips, 500 count, $63.48
  rooflineWaste: 0.1, // extra wire, bulbs and clips for leads, corners and spares
  miniStrand: 32.98, // Novelty Lights commercial 100-LED wide-angle 5 mm, 50 ft, $32.98
  netLight: 34.99, // Wintergreen 4x6 ft 100-LED warm white net, $34.99
  wreath: 112.16, // Seasonal Source 36" pre-lit LED commercial wreath, $112.16
  garlandPerFoot: 109 / 9, // Red Sleigh 9 ft pre-lit LED commercial garland (Home Depot), $109
};

// How much material each item uses.
export const usage = {
  bulbsPerFoot: 1, // C9 at 12" spacing, one clip per bulb
  strandsSmallTree: 4, // under 10 ft
  strandsMediumTree: 12, // 10 to 25 ft
  netsPerShrub: 1.5,
  windowPerimeterFeet: 14, // C9 around a typical window
};

// Laborer-hours per item (install). Height slows roofline work.
export const hours = {
  rooflineFeetPerHour: 25, // one laborer, single story, clipping and lamping C9
  story: { 1: 1, 2: 1.25, 3: 1.5 } as Record<number, number>,
  steep: 1.5, // 8/12 pitch or steeper (replaces the story factor if higher)
  treeSmall: 1,
  treeMedium: 3,
  shrub: 0.5,
  wreath: 0.5,
  window: 0.75,
  garlandPer100Feet: 1,
  electricianPerJob: 1, // power connections and timer, at the electrician rate
  takedownShare: 0.5, // takedown takes half the install hours
  serviceVisit: { laborers: 2, hours: 2 }, // one in-season maintenance call (leased plans)
};

// Crew rules for lighting jobs.
export const crew = {
  base: 2, // every lighting job: 2 laborers...
  minHours: 4, // ...for at least 4 hours each
  largeRoofline: 225, // 225+ ft of roofline with any fixtures: 3 laborers
  large: 3,
  max: 4, // more than a day's work for the crew: up to 4
  dayHours: 8,
};

export const pricing = {
  leaseSeasons: 3, // leased lights are reused for 3 seasons; each season carries a third of their cost
  rushUplift: 0.3, // install inside 5 days: overtime on labor
  offers: {
    single: { label: 'Single Install', premium: 0.2, note: 'Installed once; the lights are yours to keep.' },
    seasonal: { label: 'Seasonal Service', premium: 0, note: 'Install, in-season maintenance and takedown. Lights leased.' },
    annual: { label: 'Annual Plan', premium: -0.1, note: 'Seasonal Service on a three-year plan, price held. Lights leased.' },
  },
  minimum: 950,
  // Deposit charged online to book, on the low end of the estimate range.
  // Maryland caps home improvement deposits at one-third of the contract price.
  depositRate: 0.33, // owner: always 30-33%
  agreementVersion: '2026-11-16',
  rangeLow: 0.92,
  rangeHigh: 1.12,
} as const;

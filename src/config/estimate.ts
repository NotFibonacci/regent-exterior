// Holiday lighting estimate: cost-plus from src/config/pricing.ts.
// Shared by the estimator page and tools/estimate-check.mjs.
import { rates, materials, usage, hours, crew, pricing } from './pricing';

export type OfferKey = keyof typeof pricing.offers;
export type EstimateInput = {
  roofline: number; // ft
  stories: number; // 1, 2, 3
  steep: boolean;
  treesSmall: number;
  treesMedium: number;
  shrubs: number;
  wreaths: number;
  windows: number;
  garland: number; // ft
  offer: OfferKey;
  rush: boolean;
};

const halfUp = (h: number) => Math.ceil(h * 2) / 2;

/** Crew size and paid laborer-hours for one visit. */
export function crewFor(laborHours: number, rooflineFeet: number, hasFixtures: boolean) {
  let size: number = crew.base;
  if (rooflineFeet >= crew.largeRoofline && hasFixtures) size = crew.large;
  if (laborHours / size > crew.dayHours) size = Math.min(crew.max, Math.max(size, Math.ceil(laborHours / crew.dayHours)));
  const onSite = Math.max(crew.minHours, halfUp(laborHours / size));
  return { size, onSite, paidHours: size * onSite };
}

export function estimate(i: EstimateInput) {
  // Materials (before tax).
  const perRoofFoot = (usage.bulbsPerFoot * (materials.c9Bulb + materials.clip) + materials.c9WirePerFoot) * (1 + materials.rooflineWaste);
  const mat = {
    roofline: i.roofline * perRoofFoot,
    trees: (i.treesSmall * usage.strandsSmallTree + i.treesMedium * usage.strandsMediumTree) * materials.miniStrand,
    shrubs: i.shrubs * usage.netsPerShrub * materials.netLight,
    wreaths: i.wreaths * materials.wreath,
    windows: i.windows * usage.windowPerimeterFeet * perRoofFoot,
    garland: i.garland * materials.garlandPerFoot,
  };
  const materialCost = Object.values(mat).reduce((a, b) => a + b, 0) * (1 + rates.salesTax);

  // Install labor.
  const height = Math.max(hours.story[i.stories] ?? 1, i.steep ? hours.steep : 1);
  const installHours =
    (i.roofline / hours.rooflineFeetPerHour) * height +
    i.treesSmall * hours.treeSmall +
    i.treesMedium * hours.treeMedium +
    i.shrubs * hours.shrub +
    i.wreaths * hours.wreath +
    i.windows * hours.window * height +
    (i.garland / 100) * hours.garlandPer100Feet;
  const fixtures = i.treesSmall + i.treesMedium + i.shrubs + i.wreaths + i.windows + i.garland > 0;
  const install = crewFor(installHours, i.roofline, fixtures);
  const electrician = hours.electricianPerJob * rates.electrician;
  let labor = install.paidHours * rates.lightingLabor + electrician;

  // Leased plans add the takedown visit and one service call; the lights are
  // reused, so each season carries a share of their cost.
  const leased = i.offer !== 'single';
  let takedown = null as null | ReturnType<typeof crewFor>;
  let materialCharged = materialCost;
  if (leased) {
    takedown = crewFor(installHours * hours.takedownShare, i.roofline, fixtures);
    labor += takedown.paidHours * rates.lightingLabor + hours.serviceVisit.laborers * hours.serviceVisit.hours * rates.lightingLabor;
    materialCharged = materialCost / pricing.leaseSeasons;
  }
  if (i.rush) labor *= 1 + pricing.rushUplift;

  const cost = materialCharged + labor;
  const price = cost * (1 + rates.markup) * (1 + pricing.offers[i.offer].premium);
  const lo = Math.max(pricing.minimum, price * pricing.rangeLow);
  const hi = Math.max(pricing.minimum, price * pricing.rangeHigh);
  return {
    lo, hi, price, cost, materialCost, materialCharged, labor,
    crew: install.size, installHoursOnSite: install.onSite, installHours,
    takedownHoursOnSite: takedown?.onSite ?? 0,
    summary: `${install.size} laborers, about ${install.onSite} h on site${leased ? `; takedown ${takedown!.size} x ${takedown!.onSite} h` : ''}`,
  };
}

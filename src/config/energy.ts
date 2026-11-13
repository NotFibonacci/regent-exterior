// Running-cost assumptions for the energy calculator. LED low-voltage
// fixtures; counts are what each tier on our sample house uses.
export const energy = {
  // Maryland average residential rate, U.S. EIA (corrected figure, March 2026),
  // as published by the Maryland PSC: 22.2 cents per kWh.
  rate: 0.222,
  rateSource: 'U.S. EIA average for Maryland homes, 2026',
  transformerLoss: 1.15, // low-voltage transformers lose roughly 10-15%
  schedules: {
    evening: { label: 'Dusk to 11 pm', hours: 5.5 },
    allnight: { label: 'Dusk to dawn', hours: 12 },
  },
  holidayNights: 45, // late November to early January
  holidayHours: 6, // dusk to 11 pm in December
  layers: {
    path: { name: 'Path and landscape', tiers: [
      [{ n: 2, w: 4, what: 'path lights' }],
      [{ n: 7, w: 4, what: 'path lights' }],
      [{ n: 7, w: 4, what: 'path lights' }, { n: 6, w: 6, what: 'shrub uplights' }],
    ] },
    stone: { name: 'Stone uplights', tiers: [
      [{ n: 2, w: 7, what: 'uplights' }],
      [{ n: 4, w: 7, what: 'uplights' }],
      [{ n: 6, w: 7, what: 'uplights' }],
    ] },
    eaves: { name: 'Soffit downlights', tiers: [
      [{ n: 4, w: 5, what: 'downlights' }],
      [{ n: 7, w: 5, what: 'downlights' }],
      [{ n: 12, w: 5, what: 'downlights' }],
    ] },
    holiday: { name: 'Holiday lights', tiers: [
      [{ n: 110, w: 0.6, what: 'C9 LED bulbs' }],
      [{ n: 420, w: 0.6, what: 'C9 LED bulbs' }],
      [{ n: 420, w: 0.6, what: 'C9 LED bulbs' }, { n: 800, w: 0.05, what: 'net and mini lights' }],
    ] },
  },
} as const;

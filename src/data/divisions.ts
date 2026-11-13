export type Division = {
  slug: string;
  brand: string; // descriptor under REGENT in the lockup
  title: string;
  h1: string;
  lede: string;
  image: string;
  imageAlt: string;
  services: { name: string; text: string }[];
  approach: string[];
  faqs: { q: string; a: string }[];
  description: string;
};

export const divisions: Division[] = [
  {
    slug: 'windows',
    brand: 'Exterior Windows',
    title: 'Window replacement in Central Maryland',
    h1: 'Windows, <em>fitted to the house.</em>',
    lede: 'Replacement windows sized to the openings you have, with trim and sills finished to match the rest of the house.',
    image: '/img/windows.webp',
    imageAlt: 'Double-hung windows with white trim on grey lap siding and stone',
    description: 'Window replacement for Central Maryland homes: double-hung, casement and picture windows, measured to the opening and trimmed to match. MHIC #41139.',
    services: [
      { name: 'Double-hung and casement', text: 'Like-for-like replacement that keeps the sightlines and grille pattern of the original windows.' },
      { name: 'Picture and bay windows', text: 'Larger openings framed and flashed so the wall around them stays dry.' },
      { name: 'Basement and egress', text: 'Window-well and basement units, including openings sized for emergency egress.' },
      { name: 'Trim and sills', text: 'Exterior casing, sills and capping finished to match the trim already on the house.' },
    ],
    approach: [
      'We measure every opening ourselves; no window is ordered from an estimate.',
      'Grille patterns and colours are matched to the house, not to a catalogue default.',
      'Openings are flashed and sealed before trim goes on, so water has nowhere to sit.',
      'You get a written scope and price before anything is ordered.',
    ],
    faqs: [
      { q: 'Can new windows keep the look of my older home?', a: 'Yes. We match the grille pattern, sash proportions and trim profile so replacements read as part of the original house.' },
      { q: 'How long does a replacement take?', a: 'Most single windows are replaced in a day once the units arrive. Lead time for the units themselves depends on the manufacturer and size, and we give you that date in writing.' },
      { q: 'Do you handle permits?', a: 'Where a permit is required, we tell you up front and include it in the scope. If your home is in a historic district or HOA, we can prepare the details your review board asks for.' },
    ],
  },
  {
    slug: 'gutters',
    brand: 'Exterior Gutters',
    title: 'Gutter installation and replacement in Central Maryland',
    h1: 'Gutters that <em>carry the water away.</em>',
    lede: 'Seamless gutters and downspouts sized for your roof, pitched correctly and discharged where water can do no harm.',
    image: '/img/gutters.webp',
    imageAlt: 'White gutters and downspouts on a steep slate-grey roof and grey siding',
    description: 'Seamless gutter and downspout installation for Central Maryland homes, sized to the roof and pitched to drain. Gutter guards and repairs. MHIC #41139.',
    services: [
      { name: 'Seamless gutters', text: 'Formed on site to the length of each run, with no seams along the face to leak.' },
      { name: 'Downspouts and extensions', text: 'Placed and extended so water lands away from foundations, steps and walks.' },
      { name: 'Gutter guards', text: 'Covers matched to the trees around your house, to cut down on clearing.' },
      { name: 'Repairs and re-pitching', text: 'Sagging or overflowing runs re-hung and re-pitched, fascia repaired where it has rotted.' },
    ],
    approach: [
      'Gutter size and downspout count are worked out from the roof area each run drains, not guessed.',
      'Every run is pitched toward its outlet and checked with water before we leave.',
      'Fascia behind the gutter is inspected and repaired before new gutters go up.',
      'Hangers are spaced for Maryland snow and ice loads.',
    ],
    faqs: [
      { q: 'Why do my gutters overflow even when they are clean?', a: 'Usually the run is undersized for the roof above it, pitched the wrong way, or has too few downspouts. We measure the roof area and correct whichever it is.' },
      { q: 'Are gutter guards worth it?', a: 'Under heavy tree cover they save a lot of clearing. Which type works best depends on the trees, so we recommend one after seeing the house.' },
      { q: 'Can you match my existing colour?', a: 'Yes. Seamless gutters come in a wide range of colours, and we match the trim or fascia they sit against.' },
    ],
  },
  {
    slug: 'siding',
    brand: 'Exterior Siding',
    title: 'Siding installation and replacement in Central Maryland',
    h1: 'Siding, <em>straight and true.</em>',
    lede: 'Lap siding, shakes and trim installed with even exposures, tight corners and clean transitions to stone and brick.',
    image: '/img/siding.webp',
    imageAlt: 'Grey lap siding on a gable with a white-trimmed window',
    description: 'Siding installation and replacement for Central Maryland homes: lap siding, shakes, trim and wraps, with clean transitions to stone and brick. MHIC #41139.',
    services: [
      { name: 'Lap siding', text: 'Fibre cement and vinyl lap siding, run level with even exposures from course to course.' },
      { name: 'Shakes and accents', text: 'Shingle and board-and-batten accents for gables and dormers.' },
      { name: 'Trim and wraps', text: 'Corner boards, window and door trim, and fascia wrapped to match.' },
      { name: 'Repairs', text: 'Storm and impact damage repaired with matched profiles and colours.' },
    ],
    approach: [
      'The wall is inspected and house wrap repaired before any siding goes on.',
      'Courses are laid out so they line up across windows and around corners.',
      'Transitions to stone, brick and roofline are flashed, not just caulked.',
      'Work areas are cleaned daily and the property is walked with you at the end.',
    ],
    faqs: [
      { q: 'Fibre cement or vinyl?', a: 'Fibre cement holds a crisp line and takes paint; vinyl needs less upkeep. We walk you through both against your house and budget.' },
      { q: 'Can you replace only part of the siding?', a: 'Often, yes, if the profile and colour can be matched. We tell you honestly when a full side will look better than a patch.' },
      { q: 'How long does a whole house take?', a: 'It depends on size and detail, but most homes take one to two weeks once materials are on site. You get the schedule in writing.' },
    ],
  },
  {
    slug: 'doors',
    brand: 'Exterior Doors',
    title: 'Entry and exterior door replacement in Central Maryland',
    h1: 'The front door, <em>done properly.</em>',
    lede: 'Entry, storm and patio doors hung square, sealed tight and trimmed to suit the house they open into.',
    image: '/img/doors.webp',
    imageAlt: 'Yellow front door in a white surround beside stone steps and a clipped tree',
    description: 'Entry, storm and patio door replacement for Central Maryland homes, hung square and sealed, with matched trim and hardware. MHIC #41139.',
    services: [
      { name: 'Entry doors', text: 'Fibreglass, steel and wood entry doors, with sidelights and transoms where the opening allows.' },
      { name: 'Storm doors', text: 'Full-view and screen storm doors fitted to protect the entry door behind them.' },
      { name: 'Patio and sliding doors', text: 'Sliding and hinged patio doors, flashed into the opening.' },
      { name: 'Surrounds and hardware', text: 'Trim, pediments and hardware chosen to suit the style of the house.' },
    ],
    approach: [
      'The opening is checked for rot and squared before the new door goes in.',
      'Thresholds are flashed and sealed so water and drafts stay outside.',
      'Doors are adjusted until they close and latch with one hand.',
      'Hardware and finish are matched to the house, not chosen from what is in stock.',
    ],
    faqs: [
      { q: 'Can you keep my door surround?', a: 'If it is sound, yes. We often keep original surrounds and replace only the door and frame.' },
      { q: 'Which material lasts longest?', a: 'Fibreglass resists dents and weather and can be stained to look like wood. Steel is secure and economical. Wood is beautiful but needs regular care. We help you choose.' },
      { q: 'How long does a door replacement take?', a: 'Most entry doors are replaced in a day once the door arrives.' },
    ],
  },
];

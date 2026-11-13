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
  heroAspect?: string; // CSS aspect-ratio for the hero photo (default 4 / 3)
  heroPosition?: string; // CSS object-position for the hero crop
  gallery?: Photo[];
  galleryTitle?: string;
  swatchSets?: { id: string; label: string; title: string; body: string; tall?: boolean; items: { src: string; name: string; text: string }[] }[];
};

export type Photo = { src: string; alt: string; caption: string; w: number; h: number };

export const divisions: Division[] = [
  {
    slug: 'windows',
    brand: 'Exterior Windows',
    title: 'Window replacement in Central Maryland',
    h1: 'Windows, <em>fitted to the house.</em>',
    lede: 'Replacement windows sized to the openings you have, with trim and sills finished to match the rest of the house.',
    image: '/img/windows-gable.webp',
    imageAlt: 'Two-storey black-framed window wall set into a greige siding gable under a blue sky',
    heroAspect: '900 / 1074',
    galleryTitle: 'Light, <em>let in.</em>',
    gallery: [
      { src: '/img/windows-bay.webp', alt: 'Bright bay of tall divided-lite windows wrapping a room, with trees outside', caption: 'A full bay of divided-lite windows, set into the curve of the room.', w: 536, h: 420 },
      { src: '/img/windows-interior.webp', alt: 'Double-height living room with tall grid windows and French doors filling the room with low sun', caption: 'Tall grid windows and French doors: the reason the room is built around them.', w: 596, h: 384 },
      { src: '/img/windows-picture.webp', alt: 'Wide white picture and casement windows looking out over a garden and pool', caption: 'Wide picture and casement units that frame the garden, not the sash.', w: 522, h: 416 },
    ],
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
    image: '/img/gutters-dark.webp',
    imageAlt: 'Charcoal seamless gutter and downspout under a dark soffit on a modern house with cedar cladding',
    heroPosition: '62% 50%',
    galleryTitle: 'Finished to <em>match the trim.</em>',
    gallery: [
      { src: '/img/gutters-white.webp', alt: 'White seamless gutter and downspout under a white soffit against red brick', caption: 'White on brick: gutter, downspout and soffit in one colour so the roofline reads clean.', w: 1040, h: 586 },
      { src: '/img/gutters-dark-crop.webp', alt: 'Charcoal gutters and downspout on a modern house with cedar cladding', caption: 'Charcoal on a modern facade: the gutter runs as a line, not an afterthought.', w: 1040, h: 586 },
    ],
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
    slug: 'siding-and-stone',
    brand: 'Exterior Siding & Stone',
    title: 'Siding and stone veneer installation in Central Maryland',
    h1: 'Siding and stone, <em>straight and true.</em>',
    lede: 'Lap siding, shakes, board and batten and stone veneer, installed with even courses, tight corners and clean transitions from one material to the next.',
    image: '/img/siding-house.webp',
    imageAlt: 'Victorian house with new grey lap siding, blue scalloped shingles in the gable, blue window trim and a white wraparound porch',
    heroAspect: '3 / 2',
    description: 'Siding and stone veneer for Central Maryland homes: lap siding, shakes, board and batten, ledgestone and fieldstone facades, with flashed transitions. MHIC #41139.',
    services: [
      { name: 'Lap siding', text: 'Fibre cement and vinyl lap siding, from narrow clapboard to Dutch lap, run level with even exposures.' },
      { name: 'Shakes and board and batten', text: 'Shingle and vertical board-and-batten for gables, dormers and whole elevations.' },
      { name: 'Stone veneer', text: 'Ledgestone, fieldstone and flagstone facades, water tables and wainscots, set over a proper drainage plane.' },
      { name: 'Trim, wraps and repairs', text: 'Corner boards, window and door trim and fascia wrapped to match; storm damage repaired with matched profiles.' },
    ],
    approach: [
      'The wall is inspected and house wrap repaired before any siding or stone goes on.',
      'Courses are laid out so they line up across windows and around corners.',
      'Stone gets a drainage mat and weep screed at the base, so water can always get out.',
      'Transitions between stone, siding and roofline are flashed, not just caulked.',
    ],
    swatchSets: [
      { id: 'siding-styles', label: 'Siding profiles', title: 'Choose the <em>line.</em>', body: 'Each profile changes how a wall reads from the street: tighter courses look more traditional, wider and vertical ones more modern.', items: [
        { src: '/img/siding-clapboard.webp', name: 'Narrow clapboard', text: 'Tight, traditional courses. Suits colonials and older homes.' },
        { src: '/img/siding-dutch.webp', name: 'Dutch lap', text: 'A scooped face that throws a deeper shadow line.' },
        { src: '/img/siding-shake.webp', name: 'Shingle and shake', text: 'Straight-edge shingles for gables, dormers and coastal styles.' },
        { src: '/img/siding-batten.webp', name: 'Board and batten', text: 'Vertical lines for farmhouse and modern elevations.' },
        { src: '/img/siding-plank.webp', name: 'Wood-tone plank', text: 'Warm, wide planks as an accent on entries and modern facades.' },
      ] },
      { id: 'stone-facades', label: 'Stone facades', title: 'Stone, <em>laid by hand.</em>', body: 'Stone veneer across a whole front, or as a base course and wainscot below siding. Pattern and colour are chosen against your brick, roof and trim.', items: [
        { src: '/img/stone-ledge-grey.webp', name: 'Ledgestone, grey', text: 'Thin stacked strips with crisp shadows. Clean and contemporary.' },
        { src: '/img/stone-ledge-earth.webp', name: 'Ledgestone, earth', text: 'The same stacked pattern in warm tans and browns.' },
        { src: '/img/stone-stacked-white.webp', name: 'Stacked stone, white', text: 'Bright, textured and modern, beautiful under uplighting.' },
        { src: '/img/stone-fieldstone.webp', name: 'Fieldstone', text: 'Rounded, varied stones. The classic Maryland country look.' },
        { src: '/img/stone-drystack.webp', name: 'Drystack', text: 'Rough, deep-set stone with almost no visible mortar.' },
        { src: '/img/stone-flagstone.webp', name: 'Mosaic flagstone', text: 'Irregular flat stones fitted like a puzzle, with soft mortar joints.' },
      ] },
    ],
    galleryTitle: 'What a new facade <em>changes.</em>',
    gallery: [
      { src: '/img/siding-before-after.webp', alt: 'One window shown half with new pale green lap siding and half with old peeling painted boards', caption: 'Before and after, on one wall: new lap siding and trim beside the worn boards it replaces.', w: 674, h: 462 },
    ],
    faqs: [
      { q: 'Fibre cement or vinyl?', a: 'Fibre cement holds a crisp line and takes paint; vinyl needs less upkeep. We walk you through both against your house and budget.' },
      { q: 'Can stone veneer go on a house that has siding now?', a: 'Yes. We remove the siding where the stone will go, add the drainage layers and lath stone needs, and flash the line where stone meets siding so water stays out.' },
      { q: 'Can you replace only part of the siding?', a: 'Often, yes, if the profile and colour can be matched. We tell you honestly when a full side will look better than a patch.' },
      { q: 'How long does a whole house take?', a: 'It depends on size, detail and how much stone is involved, but most homes take one to three weeks once materials are on site. You get the schedule in writing.' },
    ],
  },
  {
    slug: 'doors',
    brand: 'Exterior Doors',
    title: 'Entry and exterior door replacement in Central Maryland',
    h1: 'The front door, <em>done properly.</em>',
    lede: 'Entry, storm and patio doors hung square, sealed tight and trimmed to suit the house they open into.',
    image: '/img/doors-entry.webp',
    imageAlt: 'Wood plank front door with glass sidelights and transom between stacked-stone columns under a covered entry',
    heroAspect: '892 / 580',
    swatchSets: [
      { id: 'door-styles', label: 'Panel styles', title: 'Start with <em>the panels.</em>', body: 'The panel layout sets the character of a door before colour or hardware. These are the patterns most homes here are built around; each comes in fibreglass, steel or wood.', tall: true, items: [
        { src: '/img/door-style-1.webp', name: 'Three-panel', text: 'One tall raised panel over two. Formal and balanced.' },
        { src: '/img/door-style-2.webp', name: 'Flush', text: 'A clean, flat face for modern and minimal homes.' },
        { src: '/img/door-style-3.webp', name: 'Full lite', text: 'A tall glass panel that brings light into the hall.' },
        { src: '/img/door-style-4.webp', name: 'Four-panel', text: 'Two over two. Simple and traditional.' },
        { src: '/img/door-style-5.webp', name: 'Four over one', text: 'Four small panels above one wide one. Colonial and craftsman.' },
        { src: '/img/door-style-6.webp', name: 'Stacked panel', text: 'Horizontal panels stacked top to bottom. Contemporary.' },
      ] },
    ],
    galleryTitle: 'An entry, <em>framed.</em>',
    gallery: [
      { src: '/img/doors-navy.webp', alt: 'Dark navy six-panel front door with two glazed lights in a white classical surround above stone steps', caption: 'A classical surround and cornice give a plain door real presence.', w: 360, h: 480 },
      { src: '/img/doors-coral.webp', alt: 'Coral six-panel front door with full-height sidelights in white trim set into red brick', caption: 'Full-height sidelights on both sides turn a door into an entrance.', w: 360, h: 480 },
      { src: '/img/doors-red.webp', alt: 'Deep red six-panel front door with a single sidelight and black hardware against white siding', caption: 'A single sidelight and dark hardware: a strong colour, kept simple.', w: 360, h: 480 },
    ],
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

// Single source for business details. Empty strings are not rendered:
// nothing here is ever invented. Fill in as the owner supplies them.
export const site = {
  name: 'Regent Exterior Services',
  license: 'MHIC #41139',
  licenseNumber: '41139',
  email: 'Regentexteriorservices@gmail.com',
  phone: '', // e.g. '(410) 555-0100' — shown site-wide once filled in
  address: '', // street address for the footer and search listings
  counties: ['Baltimore', 'Anne Arundel', 'Howard', 'Montgomery', "Prince George's", 'Carroll', 'Frederick'],
  areaLine: "Baltimore, Anne Arundel, Howard, Montgomery, Prince George's, Carroll and Frederick Counties and Baltimore City",
  holidayMinimum: 950,
  // Tracking IDs. Leave blank to load nothing; each loads only after the
  // visitor accepts that kind of cookie in the banner.
  analytics: {
    ga4: '', // Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'
    metaPixel: '', // Meta (Facebook/Instagram) Pixel ID, numbers only
  },
} as const;

export const nav = [
  { href: '/lighting/', label: 'Lighting' },
  { href: '/holiday-lighting/', label: 'Holiday' },
  { href: '/windows/', label: 'Windows' },
  { href: '/gutters/', label: 'Gutters' },
  { href: '/siding-and-stone/', label: 'Siding & Stone' },
  { href: '/doors/', label: 'Doors' },
  { href: '/service-areas/', label: 'Areas' },
  { href: '/about/', label: 'About' },
];

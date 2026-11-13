// Single source for business details. Empty strings are not rendered:
// nothing here is ever invented. Fill in as the owner supplies them.
export const site = {
  name: 'Regent Exterior Services',
  license: 'MHIC #41139',
  licenseNumber: '41139',
  email: 'Regentexteriorservices@gmail.com',
  phone: '', // e.g. '(410) 555-0100' — shown site-wide once filled in
  address: '', // street address for the footer and search listings
  counties: ['Baltimore', 'Anne Arundel', 'Howard', "Prince George's", 'Carroll'],
  holidayMinimum: 950,
} as const;

export const nav = [
  { href: '/lighting/', label: 'Lighting' },
  { href: '/holiday-lighting/', label: 'Holiday' },
  { href: '/windows/', label: 'Windows' },
  { href: '/gutters/', label: 'Gutters' },
  { href: '/siding/', label: 'Siding' },
  { href: '/doors/', label: 'Doors' },
  { href: '/service-areas/', label: 'Areas' },
  { href: '/about/', label: 'About' },
];

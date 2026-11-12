// Single source for business details. Empty strings are not rendered:
// nothing here is ever invented. Fill in as the owner supplies them.
export const site = {
  name: 'Regent Exterior Services',
  license: 'MHIC #41139',
  email: 'Regentexteriorservices@gmail.com',
  phone: '',
  address: '',
  domain: '',
  counties: ['Baltimore', 'Anne Arundel', 'Howard', "Prince George's", 'Carroll'],
  holidayMinimum: 950,
} as const;

/**
 * Company profile — every fact below is published on tmills.com.
 * Nothing here is invented. Transactional/operational records elsewhere in this
 * app are illustrative, but they are shaped around these real capabilities only.
 */
export const company = {
  legalName: 'Thiagarajar Mills (P) Limited',
  shortName: 'Thiagarajar Mills',
  tagline: 'Setting Standards. Exceeding Excellence',
  strapline: 'Threading together Tradition & Technology',
  establishedYear: 1936,
  founder: 'Shri Karumuttu Thiagarajan Chettiar',
  positioning:
    'One of the largest manufacturers and exporters of 100% Indian cotton yarn, and among the first in India to install Rieter ComforSpin K44 machines for compact yarn.',
  about:
    'Established in 1936 to supply quality cotton yarn to the industry, Thiagarajar Mills runs three spinning mills — each specialising in a distinct yarn count group.',
  vision: 'To create new benchmarks in manufacturing quality yarn and exceed expectations.',
  qualityPolicy:
    'Committed to producing cotton and blended yarns that consistently meet customer requirements in an environmentally friendly manner — through continual improvement of products, processes and systems, reduction of air pollution, conservation of natural resources, compliance with legal and environmental regulations, and employee participation.',

  headquarters: {
    address: 'Kappalur, Madurai - 625 008',
    state: 'Tamil Nadu',
    country: 'India',
  },
  contact: {
    phones: ['+91-452-2482595 (4 lines)', '+91-4549-280620', '+91-4549-280591'],
    faxes: ['+91-452-2482590', '+91-452-2486085'],
    emails: ['office@tmills.com', 'thiagarajar@gmail.com'],
    website: 'https://www.tmills.com/',
    testingReports: 'https://www.tmills.co.in',
  },

  infrastructure: {
    facilities: 4,
    spindles: 86112,
    rotors: 480,
    employees: 1600,
    dailyYarnKg: 25000,
  },

  /** Published export profile. */
  exports: {
    countries: 23,
    regions: ['America', 'Australia', 'Europe', 'South Asia'],
    exportSharePct: 90,
    annualSalesUsd: 45_000_000,
  },

  productRanges: [
    { name: 'Single Yarn', detail: 'NE 16s–80s combed, for knitting & weaving, contamination cleared and wound on Schlafhorst / Savio autoconers' },
    { name: 'Double Yarn', detail: 'NE 2/20s–2/140s combed, twisted on TFO; two-fold and multifold, TFO/DD twist without knots' },
    { name: 'Open End Yarn', detail: 'NE 6s–12s on OE-Schlafhorst machines, heavy doubling available' },
    { name: 'Compact Yarn', detail: 'Ring spun on Rieter ComforSpin K44 compact spinning, count range up to 140s' },
    { name: 'Gassed Yarn', detail: 'Singed specialty yarn — a house speciality' },
  ],
  productCategories: ['Fine Count Combed Cotton Yarn', 'Hosiery Yarn', 'Coarse Count Combed Cotton Yarn', 'Compact Yarn'],
  cottonTypes: ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima'],

  awards: [
    { title: '15 Export Awards over nine consecutive years', body: 'Various', year: '' },
    { title: 'Top Exporter of Cotton Yarn from India', body: 'Government of India', year: '1996–97' },
    { title: 'Gold Trophy', body: 'Texprocil', year: '1996–97 & 1997–98' },
    { title: '5S Platinum Level Award', body: '', year: '' },
    { title: '5S Gold Level Award', body: '', year: '' },
  ],
  certifications: [
    'ISO 9002',
    'DNV-GL ISO Certification',
    'Det Norske Veritas Management System Certificate',
    'Egyptian Cotton Trade Mark',
    'Cotton USA',
    'Cotton Leads',
    'Supima',
    'BCI (Better Cotton Initiative)',
  ],

  csr: {
    principle:
      'Guided by the noble principles and high moral values set by our founder, Shri Karumuttu Thiagarajan Chettiar, with an emphasis on education for underprivileged students.',
    institutions: [
      { name: 'Thiagarajar College of Engineering', detail: 'Run on a charitable model — no donations or capitation fees' },
      { name: 'Thiagarajar College', detail: 'Run on a charitable model — no donations or capitation fees' },
      { name: 'Thiagarajar Mills Higher Secondary School', detail: '705 students from elementary through grade XII, Kappalur' },
    ],
    reports: ['2015–16', '2016–17', '2017–18'],
  },
}

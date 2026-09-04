/**
 * Real, publicly-published company profile details sourced from tmills.com.
 * Operational figures elsewhere in this app remain illustrative demo data —
 * only the descriptive company facts below are drawn from the public website.
 */
export const company = {
  legalName: 'Thiagarajar Mills (P) Limited',
  shortName: 'Thiagarajar Mills',
  taglines: ['Setting Standards. Exceeding Excellence', 'Threading together Tradition & Technology'],
  establishedYear: 1936,
  about:
    'Established in 1936 to supply quality cotton yarn to the industry, Thiagarajar Mills operates spinning mills producing 100% cotton yarns with an emphasis on ethics, contamination control and consistent quality.',
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
  },
  productRanges: [
    { name: 'Single Yarn', detail: 'NE 16s–80s combed, for knitting & weaving, auto-coned & spliced' },
    { name: 'Double Yarn', detail: 'NE 2/20s–2/140s combed, twisted on TFO' },
    { name: 'Open End Yarn', detail: 'NE 6s–12s on Schlafhorst Autocoro, heavy doubling available' },
    { name: 'Compact Yarn', detail: 'Combed compact-spun, auto-coned & spliced' },
    { name: 'Gassed Yarn', detail: 'Specialty singed yarn for premium applications' },
  ],
  cottonBlends: ['Indian extra-long staple', 'Egyptian Cotton', 'US Pima'],
  machineryPartners: ['Rieter', 'Trutzschler', 'Savio', 'Schlafhorst', 'Oerlikon'],
  labEquipment: ['Uster Eva Tester', 'Uster Strength Tester'],
  qualityHighlights: [
    'Contamination cleared using FR 900 clearers on autoconers',
    'TFO / DD twist available without knots',
    'In-house testing services with published charges',
  ],
}

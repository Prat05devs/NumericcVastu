/**
 * Shop navigation: the header row, its mega-menu panels and the phone menu share this data. Every link lands on a
 * real listing (category + the API's own filter values) or a search, so no menu item leads to an empty page by design.
 */
export type NavLink = {label: string; href: string; note?: string};
export type NavColumn = {title: string; links: NavLink[]; grid?: boolean};
export type NavItem = {
  label: string; href: string; note: string;
  columns?: NavColumn[];
  feature?: {eyebrow: string; title: string; text: string; href: string; cta: string; art: string};
};

const q = (s: string) => `/search?q=${encodeURIComponent(s)}`;

export const NAV: NavItem[] = [
  {
    label: 'Rudraksha', href: '/rudraksha', note: 'By mukhi and origin',
    columns: [
      {title: 'By form', links: [
        {label: 'Single beads', href: '/rudraksha?attr_bead_type=single%20bead'},
        {label: 'Bracelets', href: '/rudraksha?attr_bead_type=bracelet'},
        {label: 'Malas', href: '/rudraksha?attr_bead_type=mala'},
        {label: 'Kavach', href: '/rudraksha?attr_bead_type=kavach'},
        {label: 'Combinations', href: '/rudraksha?attr_bead_type=combination'},
      ]},
      {title: 'By origin', links: [
        {label: 'Nepal', href: '/rudraksha?attr_rudraksha_origin=nepal'},
        {label: 'Java (Indonesia)', href: '/rudraksha?attr_rudraksha_origin=java%20(indonesia)'},
        {label: 'India', href: '/rudraksha?attr_rudraksha_origin=india'},
        {label: 'All rudraksha', href: '/rudraksha'},
      ]},
    ],
    feature: {eyebrow: 'Not sure which mukhi?', title: 'Find it by your number', text: 'Your Mulank points to the mukhi traditionally linked with you.', href: '/#finder', cta: 'Find my stone', art: 'rudraksha'},
  },
  {
    label: 'Gemstones', href: '/gemstones', note: 'Weight, origin, treatment',
    columns: [
      {title: 'Navaratna by planet', grid: true, links: [
        {label: 'Ruby', note: 'Sun · 1', href: q('Ruby')},
        {label: 'Pearl', note: 'Moon · 2', href: q('Pearl')},
        {label: 'Yellow Sapphire', note: 'Jupiter · 3', href: q('Yellow Sapphire')},
        {label: 'Hessonite', note: 'Rahu · 4', href: q('Hessonite')},
        {label: 'Emerald', note: 'Mercury · 5', href: q('Emerald')},
        {label: 'Diamond & Opal', note: 'Venus · 6', href: q('Opal')},
        {label: 'Cat’s Eye', note: 'Ketu · 7', href: q("Cat's Eye")},
        {label: 'Blue Sapphire', note: 'Saturn · 8', href: q('Blue Sapphire')},
        {label: 'Red Coral', note: 'Mars · 9', href: q('Red Coral')},
      ]},
      {title: 'By treatment', links: [
        {label: 'Untreated', href: '/gemstones?attr_treatment=untreated'},
        {label: 'Heated', href: '/gemstones?attr_treatment=heated'},
        {label: 'All gemstones', href: '/gemstones'},
      ]},
    ],
    feature: {eyebrow: 'Before you buy a gemstone', title: 'Check it against your chart', text: 'A gemstone should suit your whole chart. Adarshh can review it with you.', href: 'https://www.numericcvaastu.com/consultations', cta: 'Book a consultation', art: 'gem-yellow'},
  },
  {
    label: 'Crystals', href: '/crystals', note: 'Towers, clusters, raw',
    columns: [
      {title: 'By form', links: [
        {label: 'Towers & points', href: '/crystals?attr_product_form=tower'},
        {label: 'Clusters', href: '/crystals?attr_product_form=cluster'},
        {label: 'Spheres', href: '/crystals?attr_product_form=sphere'},
        {label: 'Pyramids', href: '/crystals?attr_product_form=pyramid'},
        {label: 'Trees', href: '/crystals?attr_product_form=tree'},
      ]},
      {title: 'More', links: [
        {label: 'Tumbled stones', href: '/crystals?attr_product_form=tumble'},
        {label: 'Raw crystals', href: '/crystals?attr_product_form=raw'},
        {label: 'Décor & plates', href: '/crystals?attr_product_form=d%C3%A9cor'},
        {label: 'Natural only', href: '/crystals?attr_natural_status=natural'},
        {label: 'All crystals', href: '/crystals'},
      ]},
    ],
    feature: {eyebrow: 'For the home', title: 'Clusters and towers', text: 'Chosen for desks, altars and living rooms, each with its size and origin.', href: '/crystals?attr_product_form=cluster', cta: 'Shop clusters', art: 'cluster'},
  },
  {
    label: 'Bracelets', href: '/crystals?attr_product_form=bracelet', note: 'Hand-strung beads',
    columns: [
      {title: 'Bracelets', links: [
        {label: 'Crystal bracelets', href: '/crystals?attr_product_form=bracelet'},
        {label: 'Rudraksha bracelets', href: '/rudraksha?attr_bead_type=bracelet'},
      ]},
      {title: 'By intention', links: [
        {label: 'Wealth & abundance', href: q('Citrine')},
        {label: 'Love & harmony', href: q('Rose quartz')},
        {label: 'Calm & sleep', href: q('Amethyst')},
        {label: 'Focus & confidence', href: q('Tiger')},
        {label: 'Protection', href: q('Onyx')},
      ]},
    ],
    feature: {eyebrow: 'Worn every day', title: 'Small rituals', text: 'Bracelets strung to your wrist size, listed with bead size and stone.', href: '/crystals?attr_product_form=bracelet', cta: 'Shop bracelets', art: 'bracelet-rose'},
  },
  {
    label: 'Yantras', href: '/yantras', note: 'Copper and brass',
    columns: [
      {title: 'By metal', links: [
        {label: 'Copper', href: '/yantras?attr_material=copper'},
        {label: 'Brass', href: '/yantras?attr_material=brass'},
        {label: 'Panchdhatu', href: '/yantras?attr_material=panchdhatu'},
        {label: 'Gold-plated', href: '/yantras?attr_material=gold-plated'},
        {label: 'Silver-plated', href: '/yantras?attr_material=silver-plated'},
      ]},
      {title: 'Popular', links: [
        {label: 'Shree Yantra', href: q('Shree Yantra')},
        {label: 'Vaastu Yantra', href: q('Vaastu Yantra')},
        {label: 'Kuber Yantra', href: q('Kuber')},
        {label: 'All yantras', href: '/yantras'},
      ]},
    ],
    feature: {eyebrow: 'For your space', title: 'Placed with Vaastu', text: 'Each yantra comes with its size and traditional placement guidance.', href: '/yantras', cta: 'Shop yantras', art: 'yantra'},
  },
  {label: 'Custom wristwatch', href: '/custom-wristwatch', note: 'Made to order'},
];

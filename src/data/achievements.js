/**
 * Achievements page content, from the client's profile PDF ("Drx . Adarshh Panndey.pdf", August 2026).
 * Titles and years are copied from its "Key Achievement" list; leave `year` empty where the PDF gives none.
 * Photo captions only name what is readable in the photograph itself; photos without one show no caption.
 */

const img = (slug) => `/images/achievements/${slug}.webp`;

/** The four the page opens with. The hero shows the 40 Under 40 feature, so that card shows the trophy instead. */
export const highlights = [
  {title: '40 Under 40', year: '2026', by: 'The Popular Story', text: 'Named in The Popular Story’s 40 Under 40, with a feature on his work as a numerology career coach.', image: img('cert-40-under-40-trophy'), w: 900, h: 1600},
  {title: 'Numerology Career Coach of the Year', year: '2026', by: 'Rashtriya Udyog Ratna Puraskar', text: 'Recognised as Numerology Career Coach of the Year at the Rashtriya Udyog Ratna Puraskar 2026.', image: img('cert-rashtriya-udyog-ratna-2026'), w: 1600, h: 900},
  {title: 'Book of the Year', year: '2025', by: 'GuruCool', text: 'His book, Numerology: Numbers That Speak, won GuruCool’s Book of the Year award.', image: img('book-of-the-year-plaque'), w: 1280, h: 854},
  {title: 'Jyotish Vibhushan Samman', year: '2025', text: 'Awarded the Jyotish Vibhushan Samman in 2025.'},
];

/**
 * Everything else on the PDF's list, grouped. Highlights are not repeated here.
 * `photo` is the client's photograph of that certificate or trophy (supplied October 2026); years and
 * organisers missing from the PDF were read off those certificates.
 */
export const groups = [
  {key: 'awards', title: 'Awards and honours', items: [
    {title: 'Baldev Raj Kalra Smriti Awards', year: '2025', photo: 'cert-baldev-raj-kalra-2025'},
    {title: 'Vishisht Atithi Samman', year: '2025', by: 'Workshop on birth dates, Vastu and relationships, Brij Future Point, New Delhi', photo: 'cert-vishisht-atithi-samman'},
    {title: 'Best Numerologist & Vastu Consultant', year: '2024', photo: 'cert-best-numerologist-vastu-2024'},
    {title: 'Best Numerologist', year: '2024', by: 'India@2047 Conference & Bharat Ke Maharathi 3.0, NDMC Convention Centre', photo: 'cert-india-2047-best-numerologist'},
    {title: 'Numero Star Award'},
    {title: 'Anokha Achiever Award'},
  ]},
  {key: 'guest', title: 'Invited guest and speaker', items: [
    {title: 'Creator Affiliate Conclave', year: '2026', by: 'YouTube Hustlers', photo: 'cert-creator-affiliate-conclave-2026'},
    {title: 'VIP Guest', by: 'Sanatan Ka Darshan Learner’s Webinar, on business logos and mobile numbers', photo: 'cert-sanatan-ka-darshan-vip-guest'},
    {title: 'Chief Guest', year: '2024', by: 'Bharat Occult Science 2nd Maha Sammelan, GuruJeegyan Trust, New Delhi', photo: 'cert-numerology-visharad'},
    {title: 'Anokha Trainer’s Growth Summit', year: '2023'},
  ]},
  {key: 'training', title: 'Training and certificates', items: [
    {title: 'Numerology Visharad Certificate', year: '2024', by: 'GuruJeegyan Trust'},
    {title: 'Aspire-25 Vastu Manthan', year: '2025', by: 'Pinnacle Vastu, certificate of completion', photo: 'cert-aspire-25-vastu-manthan'},
    {title: 'Signature Analysis & Rudraksh Analysis Course', year: '2025', by: 'Bhartiya Prachya Vidya Sansthan', photo: 'cert-signature-rudraksh-analysis'},
    {title: 'Deep Connections of Astrology & Numerology', year: '2024', by: 'Educational workshop, Jyotish Punj', photo: 'cert-deep-connections-workshop'},
    {title: 'Swabhas Reiki Level 1', year: '2024', by: 'Healer training course, F.O.H Foundation', photo: 'cert-swabhas-reiki-level-1'},
    {title: '10X Sales Bootcamp', year: '2026', by: 'Gaurav Bhagat Academy, certificate of completion', photo: 'cert-10x-sales-bootcamp'},
    {title: 'Online Numerology Foundation Course', year: '2021', by: 'Destiny Science', photo: 'cert-destiny-science-foundation'},
  ]},
];

/** Certificates and trophies for the photo wall, built from the list above plus the GuruCool award. */
const PHOTO_SIZES = {
  'cert-baldev-raj-kalra-2025': [900, 1600], 'cert-vishisht-atithi-samman': [900, 1600], 'cert-best-numerologist-vastu-2024': [1600, 900],
  'cert-india-2047-best-numerologist': [900, 1600], 'cert-creator-affiliate-conclave-2026': [900, 1600], 'cert-sanatan-ka-darshan-vip-guest': [900, 1600],
  'cert-numerology-visharad': [1553, 1600], 'cert-aspire-25-vastu-manthan': [1600, 900], 'cert-signature-rudraksh-analysis': [1600, 900],
  'cert-deep-connections-workshop': [900, 1600], 'cert-swabhas-reiki-level-1': [1600, 900], 'cert-10x-sales-bootcamp': [1600, 900],
  'cert-destiny-science-foundation': [1600, 900],
};
export const certificates = [
  {src: img('cert-gurucool-book-of-the-year'), w: 900, h: 1600, caption: 'GuruCool Book of the Year, 2025'},
  ...groups.flatMap((g) => g.items.filter((i) => i.photo).map((i) => ({src: img(i.photo), w: PHOTO_SIZES[i.photo][0], h: PHOTO_SIZES[i.photo][1], caption: `${i.title}${i.year ? `, ${i.year}` : ''}`}))),
];

export const press = [
  {name: 'The Popular Story', title: 'Featured in 40 Under 40 as a leading numerology career coach', image: img('popular-story-40-under-40'), w: 1120, h: 840},
  {name: 'Hindustan Metro', title: 'Mr. Adarshh Panndey, one of India’s leading numerology career coaches and the founder of NumericcVaastu Training & Consultancy', image: img('hindustan-metro-feature'), w: 1326, h: 939},
  {name: 'Inkspire, September 2025', title: 'Cover story', image: img('inkspire-cover-story-1'), w: 638, h: 903},
];

/** Launch of Numerology: Numbers That Speak at The Trainers’ Camp. The page shows the first two beside the book video. */
export const bookLaunch = [
  {src: img('book-launch-release'), w: 1200, h: 1600, caption: 'Releasing the book at The Trainers’ Camp'},
  {src: img('book-launch-talk'), w: 908, h: 1210, caption: 'Speaking at the launch'},
  {src: img('book-presented-01'), w: 630, h: 1120},
  {src: img('book-presented-02'), w: 540, h: 960},
];

export const moments = [
  {src: img('international-awards-spotlight'), w: 1280, h: 853, caption: 'International Awards Spotlight & Book Ceremony'},
  {src: img('aspire-25-certificate'), w: 1232, h: 821, caption: 'Receiving his certificate at Pinnacle Vastu’s Aspire-25'},
  {src: img('award-presentation-01'), w: 600, h: 800},
  {src: img('talk-astro-gyaan-mahakumbh'), w: 1050, h: 700, caption: 'Speaking at Astro Gyaan Ka Mahakumbh'},
  {src: img('award-presentation-02'), w: 1120, h: 747},
  {src: img('talk-hot-media-house'), w: 590, h: 1050},
  {src: img('aspire-25-group'), w: 1280, h: 720, caption: 'Aspire-25 with Pinnacle Vastu'},
  {src: img('talk-audience'), w: 1050, h: 700},
  {src: img('inkspire-cover-story-2'), w: 797, h: 1128, caption: 'Inkspire cover story, September 2025'},
];

export const achievementCount = highlights.length + groups.reduce((n, g) => n + g.items.length, 0);

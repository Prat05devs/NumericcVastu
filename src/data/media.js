/**
 * Homepage proof, social and video content.
 * Leave a link empty until the client supplies it. Entries without a link are hidden on the
 * live site; they appear as layout placeholders only in `next dev`, or when
 * NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS=1 is set for a client preview build.
 */

export const social = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/numerologybyaadarshh/',
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || '',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || '',
};

/** Public Instagram profile snapshot, copied from instagram.com/numerologybyaadarshh on 10 October 2026.
 *  Update the counts from time to time; the photo is Instagram's 150px version (ask for a larger original). */
export const instagramProfile = {
  handle: 'numerologybyaadarshh',
  verified: true,
  name: 'Adarshh Panndey | India Leading Numerology Career Coach',
  category: 'Astrologist and psychic',
  avatar: '/images/reels/profile-numerologybyaadarshh.webp',
  counts: [['1,382', 'posts'], ['24.2K', 'followers'], ['410', 'following']],
  bio: ['🎓 India’s Leading Numerologist & Vastu Expert', '🔮 Crystals | Rudraksha', '✨ 7+ Years | 20K+ Consultations', '🚀 Learn Now! 👇'],
  link: {label: 'learn.numericcvaastu.com', href: 'https://learn.numericcvaastu.com/'},
  asOf: '10 October 2026',
};

/** Reconfirm each figure with the client before launch; `source` records where it came from. */
export const stats = [
  {value: '20,000+', label: 'Consultations', source: 'Instagram bio, October 2026'},
  {value: '20+', label: 'Podcasts and interviews', source: 'Client brief, October 2026'},
  {value: '7+', label: 'Years of practice', source: 'Instagram bio, October 2026'},
  {value: '24K+', label: 'Instagram followers', source: 'instagram.com/numerologybyaadarshh, 10 October 2026'},
];

export const book = {
  title: 'Numerology: Numbers That Speak',
  subtitle: 'What Your Numbers Reveal',
  feature: 'Featured in Inkspire, June 2025',
};

/** Hero photos: real event, studio and portrait photographs first, the two edited studio portraits last. `position` keeps the face in frame. */
export const heroSlides = [
  {src: '/images/gallery/portrait-arms-crossed.webp', alt: 'Adarshh Pandey standing with arms crossed in a studio', position: '50% 22%'},
  {src: '/images/gallery/media-podcast-portrait.webp', alt: 'Adarshh Pandey seated at a podcast microphone', position: '50% 30%'},
  {src: '/images/gallery/award-book-of-the-year.webp', alt: 'Adarshh Pandey receiving the Book of the Year award on stage', position: '30% 40%'},
  {src: '/images/gallery/talk-ntt-talk-show.webp', alt: 'Adarshh Pandey speaking on the NTT Talk Show stage', position: '50% 25%'},
  {src: '/images/gallery/portrait-standing.webp', alt: 'Adarshh Pandey standing with his hands together', position: '50% 22%'},
  {src: '/images/gallery/talk-mahakumbh-podium.webp', alt: 'Adarshh Pandey speaking at a podium', position: '22% 45%'},
  {src: '/images/gallery/media-podcast-red-set.webp', alt: 'Adarshh Pandey seated in a studio chair with a microphone', position: '50% 28%'},
  // Edited studio portraits go last, after the real photographs.
  {src: '/images/adarshh/adarshh-pandey-studio-portrait.webp', alt: 'Adarshh Pandey in a studio portrait against a purple background', position: '50% 30%'},
  {src: '/images/adarshh/adarshh-pandey-with-book.webp', alt: 'Adarshh Pandey holding his book Numerology: Numbers That Speak', position: '45% 40%'},
];

export const marqueeRows = [
  ['award-book-of-the-year', 'media-podcast-chair', 'talk-mahakumbh-stage', 'award-efi-conclave', 'media-interview-namaste', 'event-change-your-life', 'award-international-spotlight', 'media-studio-2025', 'talk-ntt-talk-show', 'event-studio-harmonium'],
  ['media-podcast-studio', 'award-national-awards-2025', 'talk-audience-session', 'media-magazine-book-feature', 'event-mahakumbh-guests', 'award-sanatan-trophy', 'media-podcast-red-set', 'event-on-stage-greeting', 'award-felicitation-stage', 'media-interview-host'],
];

/** Award titles come from text visible in each photograph; confirm names and years with the client. */
export const awards = [
  {slug: 'award-book-of-the-year', title: 'Book of the Year award'},
  {slug: 'award-national-awards-2025', title: 'National Awards 2025'},
  {slug: 'award-efi-conclave', title: 'Entrepreneurs Forum of India conclave'},
  {slug: 'award-international-spotlight', title: 'International Awards Spotlight ceremony'},
  {slug: 'award-sanatan-trophy', title: 'Sanatan recognition'},
  {slug: 'award-mahakumbh-plaque', title: 'Mahakumbh felicitation'},
  {slug: 'award-felicitation-stage', title: 'Felicitation on stage'},
  {slug: 'award-plaque-presentation', title: 'Award presentation'},
];

/**
 * Videos shown in the "Watch" section.
 * youtubeId: the 11-character id from youtube.com/watch?v=… or youtube.com/shorts/…
 * instagramUrl: the full reel link, e.g. https://www.instagram.com/reel/ABC123xyz/
 * poster: optional; YouTube entries fall back to the video's own thumbnail.
 */
export const videos = {
  podcasts: [
    {title: 'Podcast conversation', youtubeId: '', poster: '/images/gallery/media-podcast-studio.webp'},
    {title: 'Studio interview', youtubeId: '', poster: '/images/gallery/media-studio-interview.webp'},
    {title: 'Podcast conversation', youtubeId: '', poster: '/images/gallery/media-interview-host.webp'},
    {title: 'Studio interview', youtubeId: '', poster: '/images/gallery/media-studio-2025.webp'},
  ],
  shorts: [
    {title: 'YouTube Short', youtubeId: '', poster: '/images/gallery/media-podcast-portrait.webp'},
    {title: 'YouTube Short', youtubeId: '', poster: '/images/gallery/media-podcast-chair.webp'},
    {title: 'YouTube Short', youtubeId: '', poster: '/images/gallery/portrait-seated.webp'},
    {title: 'YouTube Short', youtubeId: '', poster: '/images/gallery/media-interview-namaste.webp'},
    {title: 'YouTube Short', youtubeId: '', poster: '/images/gallery/portrait-standing.webp'},
  ],
  /** Top reels chosen by the client with view counts from Instagram (October 2026), most viewed first.
   *  `views` is a plain number; the site formats it (1600000 → 1.6M) and adds the total to the section.
   *  `with` marks a collaboration posted by another account. Covers are saved locally because Instagram image links expire. */
  reels: [
    {title: 'Mulank 1 in 2026: lucky or danger?', views: 1600000, instagramUrl: 'https://www.instagram.com/reel/DTnnlO_EjGu/', poster: '/images/reels/DTnnlO_EjGu.webp'},
    {title: 'Born on the 8th, 17th or 26th? What Mulank 8 should do', views: 1400000, instagramUrl: 'https://www.instagram.com/reel/DMNWt7ZSTe_/', poster: '/images/reels/DMNWt7ZSTe_.webp'},
    {title: 'Mulank 4: relationships in 2026', views: 1300000, instagramUrl: 'https://www.instagram.com/reel/DZ-pNBTSOAW/', poster: '/images/reels/DZ-pNBTSOAW.webp'},
    {title: 'How missing numbers block your success', views: 331000, instagramUrl: 'https://www.instagram.com/reel/DbbaGYLSwG8/', poster: '/images/reels/DbbaGYLSwG8.webp', with: 'Bharat Brand Baazar'},
    {title: 'Mulank 1: how will the next three months go?', views: 50000, instagramUrl: 'https://www.instagram.com/reel/DeQ2tuqTwae/', poster: '/images/reels/DeQ2tuqTwae.webp', with: 'Anuj Srivastava'},
    {title: 'Mobile number combinations: 2-4, 4-4 and 2-3', views: 28000, instagramUrl: 'https://www.instagram.com/reel/Dc56oUqnc2b/', poster: '/images/reels/Dc56oUqnc2b.webp'},
  ],
};

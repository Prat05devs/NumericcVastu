/**
 * Homepage proof, social and video content.
 * Leave a link empty until the client supplies it. Entries without a link are hidden on the
 * live site; they appear as layout placeholders only in `next dev`, or when
 * NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS=1 is set for a client preview build.
 */

export const social = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/numerologybyaadarshh/',
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/@Numerologistadarshpandey',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://wa.me/919870197315?text=' + encodeURIComponent('Namaste Adarshh ji 🙏 I found you on numericcvaastu.com and would like to know more.'),
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
  {src: '/images/gallery/media-podcast-portrait.webp', alt: 'Adarshh Pandey seated at a podcast microphone', position: '50% 30%'},
  {src: '/images/gallery/award-book-of-the-year.webp', alt: 'Adarshh Pandey receiving the Book of the Year award on stage', position: '30% 40%'},
  {src: '/images/gallery/talk-ntt-talk-show.webp', alt: 'Adarshh Pandey speaking on the NTT Talk Show stage', position: '50% 25%'},
  {src: '/images/gallery/portrait-standing.webp', alt: 'Adarshh Pandey standing with his hands together', position: '50% 22%'},
  {src: '/images/gallery/talk-mahakumbh-podium.webp', alt: 'Adarshh Pandey speaking at a podium', position: '22% 45%'},
  {src: '/images/gallery/media-podcast-red-set.webp', alt: 'Adarshh Pandey seated in a studio chair with a microphone', position: '50% 28%'},
  // Edited studio portraits go last, after the real photographs.
  {src: '/images/adarshh/adarshh-pandey-studio-portrait.webp', alt: 'Adarshh Pandey in a studio portrait against a purple background', position: '50% 30%'},
  {src: '/images/adarshh/adarshh-pandey-with-book.webp', alt: 'Adarshh Pandey holding his book Numerology: Numbers That Speak', position: '45% 40%'},
  {src: '/images/gallery/portrait-arms-crossed.webp', alt: 'Adarshh Pandey standing with arms crossed in a studio', position: '50% 22%'},
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
  /** From youtube.com/@Numerologistadarshpandey (October 2026): his podcast playlist plus his most-viewed
   *  podcast-style video, most viewed first. Thumbnails are saved locally so nothing loads from YouTube until play. */
  podcasts: [
    {title: 'Mobile number’s last 6 digits can change your luck', youtubeId: 'kCPtD7mMC-Q', poster: '/images/youtube/kCPtD7mMC-Q.webp'},
    {title: 'How to manifest love, career and money', youtubeId: 'm9IGTcZQWRY', poster: '/images/youtube/m9IGTcZQWRY.webp'},
    {title: 'Loans, stress and pain: healing over manifestation', youtubeId: 'xozPx9IbpvQ', poster: '/images/youtube/xozPx9IbpvQ.webp'},
    {title: 'Mulank 2, 4 and 8: know your lucky and enemy numbers', youtubeId: 'OZqY4L99khg', poster: '/images/youtube/OZqY4L99khg.webp'},
    {title: 'Lal Kitab vs astrology: predictions and career secrets', youtubeId: 'SdrSfaJAEc0', poster: '/images/youtube/SdrSfaJAEc0.webp'},
    {title: 'How missing numbers block your success', youtubeId: 'vjBBaqjPT_I', poster: '/images/youtube/vjBBaqjPT_I.webp', with: 'Mushtaq Khan'},
    {title: 'Lucky numbers for love, business and life', youtubeId: '8bk-2Yqg9So', poster: '/images/youtube/8bk-2Yqg9So.webp'},
  ],
  /** Most-viewed YouTube Shorts in which Adarshh appears on screen (October 2026). */
  shorts: [
    {title: 'Keeping deities at home: faith and respect', youtubeId: 'TEpksbK16sE', poster: '/images/youtube/TEpksbK16sE.webp'},
    {title: 'Where to keep photos of departed loved ones', youtubeId: 'mbilJsEki-c', poster: '/images/youtube/mbilJsEki-c.webp'},
    {title: 'Your money mindset and your numbers', youtubeId: '-7S0Jn3vg-4', poster: '/images/youtube/-7S0Jn3vg-4.webp'},
    {title: 'Lord Ganesha at the entrance: what Vastu says', youtubeId: 'GtMRrOeAJdg', poster: '/images/youtube/GtMRrOeAJdg.webp'},
    {title: 'Is your home’s energy working for you?', youtubeId: 'ZUOdveRJzxA', poster: '/images/youtube/ZUOdveRJzxA.webp'},
    {title: 'Your numbers may reveal more than you think', youtubeId: 'J6HHjH6HS6o', poster: '/images/youtube/J6HHjH6HS6o.webp'},
    {title: 'Money decisions shouldn’t be guesswork', youtubeId: 'I39ymqvo88w', poster: '/images/youtube/I39ymqvo88w.webp'},
    {title: 'Turn numerology into a career', youtubeId: 'iCe965z5nuk', poster: '/images/youtube/iCe965z5nuk.webp'},
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

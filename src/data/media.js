import {appearances, ownShow} from './podcasts';
import {contact} from './contact';

/**
 * Homepage proof, social and video content.
 * Leave a link empty until the client supplies it. Entries without a link are hidden on the
 * live site; they appear as layout placeholders only in `next dev`, or when
 * NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS=1 is set for a client preview build.
 */

export const social = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/numerologybyaadarshh/',
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/@Numerologistadarshpandey',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || `https://wa.me/${contact.whatsapp}?text=` + encodeURIComponent('Namaste Adarshh ji 🙏 I found you on numericcvaastu.com and would like to know more.'),
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

/** Reconfirm each figure with the client before launch; `source` records where it came from.
 *  `live` makes the figure tick upwards on screen like a live subscriber counter: a random [min, max]
 *  added every `every` ms (components/LiveCount.jsx). Leave it off for figures that should stay fixed. */
export const stats = [
  {value: '80,000,000+', label: 'Views across all platforms', source: 'Client, 21 October 2026', live: {step: [3, 19], every: 1600}},
  {value: '20,000+', label: 'Consultations', source: 'Instagram bio, October 2026', live: {step: [1, 1], every: 9000}},
  {value: `${appearances.length + ownShow.length}+`, label: 'Podcast conversations', source: 'data/podcasts.js'},
  {value: '7+', label: 'Years of practice', source: 'Instagram bio, October 2026'},
  {value: '24,200+', label: 'Instagram followers', source: 'instagram.com/numerologybyaadarshh, 10 October 2026', live: {step: [1, 2], every: 6000}},
];

export const book = {
  title: 'Numerology: Numbers That Speak',
  subtitle: 'What Your Numbers Reveal',
  fullTitle: 'Numerology – Numbers That Speak: What Your Numbers Reveal',
  feature: 'Featured in Inkspire, June 2025',
  isbn: '9348518496',
  amazon: 'https://www.amazon.in/dp/9348518496',
};

/** Hero photos: real event, studio and portrait photographs first, the two edited studio portraits last. `position` keeps the face in frame. */
export const heroSlides = [
  {src: '/images/gallery/media-podcast-portrait.webp', alt: 'Adarshh Panndey seated at a podcast microphone'},
  {src: '/images/gallery/award-book-of-the-year.webp', alt: 'Adarshh Panndey receiving the Book of the Year award on stage'},
  {src: '/images/gallery/talk-ntt-talk-show.webp', alt: 'Adarshh Panndey speaking on the NTT Talk Show stage'},
  {src: '/images/gallery/portrait-standing.webp', alt: 'Adarshh Panndey standing with his hands together'},
  {src: '/images/gallery/talk-mahakumbh-podium.webp', alt: 'Adarshh Panndey speaking at a podium'},
  {src: '/images/gallery/media-podcast-red-set.webp', alt: 'Adarshh Panndey seated in a studio chair with a microphone'},
  // Edited studio portraits go last, after the real photographs.
  {src: '/images/adarshh/adarshh-pandey-studio-portrait.webp', alt: 'Adarshh Panndey in a studio portrait against a purple background'},
  {src: '/images/adarshh/adarshh-pandey-with-book.webp', alt: 'Adarshh Panndey holding his book Numerology: Numbers That Speak'},
  {src: '/images/gallery/portrait-arms-crossed.webp', alt: 'Adarshh Panndey standing with arms crossed in a studio'},
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
/** Client rule: podcasts under this many YouTube views are not shown in the homepage highlights. */
export const PODCAST_MIN_VIEWS = 30000;

export const videos = {
  /** The client shows only podcasts with at least 30K views on YouTube (October 2026). Built from
   *  data/podcasts.js, most viewed first, so episodes join or leave as their view counts are updated. */
  podcasts: [...appearances, ...ownShow]
    .filter((e) => e.views >= PODCAST_MIN_VIEWS)
    .sort((a, b) => b.views - a.views)
    .map((e) => ({title: e.title, youtubeId: e.id, poster: `/images/podcasts/${e.id}.webp`, views: e.views, with: e.show})),
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
    // Added 21 October 2026 at the client's request. Instagram hides reel views from logged-out visitors; add `views` once the client shares the count.
    {title: 'Dharmendra ji and the challenging 8–2 phase', instagramUrl: 'https://www.instagram.com/reel/DRcMX9Diafk/', poster: '/images/reels/DRcMX9Diafk.webp', with: 'Ekta Mishra'},
  ],
};

/** Self-hosted videos in public/videos, supplied by the client in October 2026. Posters are frames from each video.
 *  The students are not named on screen; add `name` to an entry once the client confirms it may be shown. */
export const studentVideos = [
  {src: '/videos/student-feedback-01.mp4', poster: '/videos/posters/student-feedback-01.webp', title: 'Student feedback on Adarshh’s numerology course', minutes: '1:19'},
  {src: '/videos/student-feedback-02.mp4', poster: '/videos/posters/student-feedback-02.webp', title: 'Student feedback on Adarshh’s numerology course', minutes: '2:34'},
  {src: '/videos/student-feedback-03.mp4', poster: '/videos/posters/student-feedback-03.webp', title: 'Student feedback on Adarshh’s numerology course', minutes: '2:08'},
];

/** Adarshh walking through his book, Numerology: Numbers That Speak. */
export const bookVideo = {src: '/videos/book-numbers-that-speak.mp4', poster: '/videos/posters/book-numbers-that-speak.webp', title: 'Adarshh Panndey on his book, Numerology: Numbers That Speak', minutes: '1:34'};

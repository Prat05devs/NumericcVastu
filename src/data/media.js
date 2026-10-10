/**
 * Homepage proof, social and video content.
 * Leave a link empty until the client supplies it. Entries without a link are hidden on the
 * live site; they appear as layout placeholders only in `next dev`, or when
 * NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS=1 is set for a client preview build.
 */

export const social = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || '',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL || '',
};

/** Reconfirm each figure with the client before launch; `source` records where it came from. */
export const stats = [
  {value: '10,000+', label: 'Consultations and webinar sessions', source: 'numericcvaastu.in'},
  {value: '20+', label: 'Podcasts and interviews', source: 'Client brief, October 2026'},
  {value: '6+', label: 'Years of practice', source: 'numericcvaastu.in'},
  {value: '1', label: 'Published book on numerology', source: 'Inkspire feature, June 2025'},
];

export const book = {
  title: 'Numerology: Numbers That Speak',
  subtitle: 'What Your Numbers Reveal',
  feature: 'Featured in Inkspire, June 2025',
};

/** Labels describe only what each photograph shows; replace with confirmed event names and years. */
export const heroSlides = [
  {src: '/images/adarshh/adarshh-pandey-studio-portrait.webp', alt: 'Adarshh Pandey in a studio portrait against a purple background', label: 'Numerologist · Author · Teacher', position: '50% 30%'},
  {src: '/images/gallery/media-podcast-portrait.webp', alt: 'Adarshh Pandey seated at a podcast microphone', label: 'On air: 20+ podcasts and interviews', position: '50% 35%'},
  {src: '/images/gallery/award-book-of-the-year.webp', alt: 'Adarshh Pandey receiving the Book of the Year award on stage', label: 'Book of the Year award', position: '30% 40%'},
  {src: '/images/gallery/talk-ntt-talk-show.webp', alt: 'Adarshh Pandey speaking on the NTT Talk Show stage', label: 'On stage at the NTT Talk Show', position: '50% 30%'},
  {src: '/images/adarshh/adarshh-pandey-with-book.webp', alt: 'Adarshh Pandey holding his book Numerology: Numbers That Speak', label: 'Author of Numerology: Numbers That Speak', position: '45% 40%'},
  {src: '/images/gallery/talk-mahakumbh-podium.webp', alt: 'Adarshh Pandey speaking at a podium', label: 'Speaking to live audiences', position: '22% 45%'},
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
  reels: [
    {title: 'Instagram reel', instagramUrl: '', poster: '/images/gallery/media-podcast-red-set.webp'},
    {title: 'Instagram reel', instagramUrl: '', poster: '/images/gallery/talk-ntt-talk-show.webp'},
    {title: 'Instagram reel', instagramUrl: '', poster: '/images/gallery/portrait-arms-crossed.webp'},
    {title: 'Instagram reel', instagramUrl: '', poster: '/images/gallery/event-book-presentation.webp'},
    {title: 'Instagram reel', instagramUrl: '', poster: '/images/gallery/award-plaque-presentation.webp'},
  ],
};

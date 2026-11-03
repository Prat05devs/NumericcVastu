import {topChannels, TOP_MIN_SUBSCRIBERS} from './podcasts';

/**
 * Instagram pages Adarshh has collaborated with (collab reels and posts), for the home page "featured on" row.
 * Add one entry per page — {name, handle, slug, followers, asOf} — and save its profile picture as
 * public/images/partners/<slug>.webp (square, 160px or larger). Only pages with HOME_MIN_AUDIENCE followers or more
 * appear on the home page. Instagram hides profiles from logged-out visitors, so handles, follower counts and pictures
 * come from the client (or from the official Instagram API once it is set up; see docs/INSTAGRAM.md).
 * Known collaborators still waiting for handles and follower counts: Bharat Brand Baazar, Anuj Srivastava, Ekta Mishra.
 */
export const instagramPartners = [
  // {name: 'Example Page', handle: 'examplepage', slug: 'example-page', followers: 250000, asOf: '2026-11-03'},
];

export const HOME_MIN_AUDIENCE = TOP_MIN_SUBSCRIBERS; // 100,000 subscribers or followers
/** The home row moves once it has at least this many logos; fewer stay still and centred. */
export const MOVE_FROM = 8;

/** YouTube channels and Instagram pages for the home row, biggest audience first. */
export const homeFeatured = [
  ...topChannels.map((c) => ({...c, platform: 'youtube', audience: c.subscribers})),
  ...instagramPartners.filter((p) => p.followers >= HOME_MIN_AUDIENCE).map((p) => ({
    ...p, platform: 'instagram', audience: p.followers, logo: `/images/partners/${p.slug}.webp`, url: `https://www.instagram.com/${p.handle}/`,
  })),
].sort((a, b) => b.audience - a.audience);

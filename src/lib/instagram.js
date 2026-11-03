import {instagramProfile, stats} from '../data/media';

/** How often the counts are fetched again from Instagram: every five days. */
export const INSTAGRAM_REFRESH_SECONDS = 60 * 60 * 24 * 5;

/**
 * Adarshh's current Instagram follower, following and post counts from the official Instagram API.
 *
 * The answer is kept in Next.js's data cache for five days, so Instagram is asked at most once every five days and
 * pages stay fast. Set INSTAGRAM_ACCESS_TOKEN (and INSTAGRAM_USER_ID for a Facebook Page token) in the hosting
 * environment; docs/INSTAGRAM.md explains how to get them. Without a token, or if Instagram does not answer,
 * the counts typed into src/data/media.js are shown instead.
 */
async function fetchCounts() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  const fields = 'followers_count,follows_count,media_count';
  const id = process.env.INSTAGRAM_USER_ID;
  // A Page access token (Facebook Login) does not expire; an Instagram Login token expires after 60 days.
  const url = id
    ? `https://graph.facebook.com/${encodeURIComponent(id)}?fields=${fields}&access_token=${encodeURIComponent(token)}`
    : `https://graph.instagram.com/me?fields=${fields}&access_token=${encodeURIComponent(token)}`;
  try {
    const response = await fetch(url, {next: {revalidate: INSTAGRAM_REFRESH_SECONDS, tags: ['instagram']}, signal: AbortSignal.timeout(8000)});
    if (!response.ok) return null;
    const data = await response.json();
    if (!Number.isFinite(data.followers_count)) return null;
    return {followers: data.followers_count, following: data.follows_count, posts: data.media_count};
  } catch {
    return null;
  }
}

const number = (n) => n.toLocaleString('en-US');
/** Rounded down to the hundred so it never overstates: 25,468 → "25,400+". */
const roundedDown = (n) => `${number(Math.floor(n / 100) * 100)}+`;
/** Instagram's own style, rounded down: 25,468 → "25.4K". */
const short = (n) => (n >= 1e4 ? `${Math.floor(n / 100) / 10}K` : number(n));

/** The homepage stats and Instagram card, with live counts when the API is configured. */
export async function getInstagramData() {
  const live = await fetchCounts();
  if (!live) return {stats, instagramProfile};
  return {
    stats: stats.map((s) => (s.label === 'Instagram followers' ? {...s, value: roundedDown(live.followers), source: 'Instagram API'} : s)),
    instagramProfile: {
      ...instagramProfile,
      counts: [
        [Number.isFinite(live.posts) ? number(live.posts) : instagramProfile.counts[0][0], 'posts'],
        [short(live.followers), 'followers'],
        [Number.isFinite(live.following) ? number(live.following) : instagramProfile.counts[2][0], 'following'],
      ],
    },
  };
}

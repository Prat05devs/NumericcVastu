import {env} from '../config/env.js';

/** Public URL for a stored object. Local driver serves through the API; S3-compatible storage through its CDN URL. */
export function mediaUrl(objectKey: string): string {
  const base = env().PUBLIC_MEDIA_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/${objectKey}` : `${env().API_BASE_URL}/api/v1/media/${objectKey}`;
}

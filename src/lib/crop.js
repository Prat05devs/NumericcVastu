import {faceBoxes} from '../data/faces';
import {photos} from '../data/content';

const size = Object.fromEntries(photos.map((p) => [p.src, [p.w, p.h]]));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * CSS object-position that keeps every face in a photo inside a cropped frame.
 * frameAspect is the frame's width / height at its widest (most cropping) layout.
 * Faces sit a little below the top edge so heads always have headroom; anything that
 * cannot fit (a very tall group in a short frame) is centred on the faces instead.
 */
export function cropPosition(src, frameAspect, dims) {
  const [w, h] = dims || size[src] || [];
  const box = faceBoxes[src];
  if (!w || !h) return box ? `${Math.round(((box[0] + box[2]) / 2) * 100)}% 25%` : '50% 25%';
  const imageAspect = w / h;
  if (!box) return imageAspect < frameAspect ? '50% 20%' : '50% 50%';
  const [x0, y0, x1, y1] = box;
  if (imageAspect < frameAspect) {
    // Frame is wider than the photo: only part of the height is visible.
    const visible = imageAspect / frameAspect;
    const boxHeight = y1 - y0;
    const top = boxHeight <= visible
      ? clamp(Math.max(y0 - visible * 0.16, y1 - visible), 0, 1 - visible)
      : clamp((y0 + y1) / 2 - visible / 2, 0, 1 - visible);
    return `50% ${Math.round((top / (1 - visible)) * 100)}%`;
  }
  // Frame is taller than the photo: only part of the width is visible.
  const visible = frameAspect / imageAspect;
  if (visible >= 1) return '50% 50%';
  const left = clamp((x0 + x1) / 2 - visible / 2, 0, 1 - visible);
  return `${Math.round((left / (1 - visible)) * 100)}% 50%`;
}

/** Spread onto next/image: style={crop(src, 4 / 3)} */
export const crop = (src, frameAspect, dims) => ({objectPosition: cropPosition(src, frameAspect, dims)});

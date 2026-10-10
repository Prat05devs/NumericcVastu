import {Star} from 'lucide-react';

const initials = (name) => {
  const words = name.replace(/^Dr(?=[A-Z])/, '').split(/\s+/).filter(Boolean);
  return (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase();
};

/** Verbatim client reviews. Text cut off at the source ends in an ellipsis rather than invented words. */
export default function ReviewCards({reviews, className = ''}) {
  return <div className={`nv-reviews ${className}`}>
    {reviews.map((review) => <figure key={review.name} className="nv-review">
      <div className="nv-review__stars" role="img" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({length: 5}, (_, i) => <Star key={i} size={18} fill={i < review.rating ? 'currentColor' : 'none'} aria-hidden="true"/>)}
      </div>
      <blockquote><p>“{review.text}{review.partial ? '…' : ''}”</p></blockquote>
      <figcaption>
        <span className="nv-review__avatar" aria-hidden="true">{initials(review.name)}</span>
        <span><b>{review.name}</b><small>Google review</small></span>
      </figcaption>
    </figure>)}
  </div>;
}

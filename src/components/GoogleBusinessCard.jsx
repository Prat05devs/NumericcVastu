import LocalizedContent from '../i18n/LocalizedContent';
import {ArrowUpRight, MapPin, Phone, Star} from 'lucide-react';
import {contact} from '../data/contact';

/**
 * Links to the Google Business Profile, where "numerologist near me" searches, map directions, calls and reviews
 * happen. More reviews on that profile is the strongest local ranking signal the business controls.
 * `compact` drops the description for tight spaces such as the consultation and checkout pages.
 */
export default function GoogleBusinessCard({compact = false, title = 'Find Adarshh on Google', className = ''}) {
  const gbp = contact.googleBusiness;
  const rated = gbp.rating && gbp.reviewCount;
  return <LocalizedContent><aside className={`gbp-card ${compact ? 'is-compact' : ''} ${className}`} aria-label="Google Business Profile">
    <div className="gbp-card__head">
      <span className="gbp-card__badge" aria-hidden="true"><Star size={18} fill="currentColor"/></span>
      <div>
        <small>Google Business Profile</small>
        <h3>{title}</h3>
      </div>
    </div>
    {rated && <p className="gbp-card__rating"><b>{gbp.rating}</b> <span aria-hidden="true">★★★★★</span> {`${gbp.reviewCount} Google reviews`}</p>}
    {!compact && <p>Directions to the Rohini office, a one-tap call, and every review clients have left. Had a session? A short Google review helps others find the right guidance.</p>}
    <div className="gbp-card__actions">
      <a className="hv-button hv-button--gold" href={contact.reviewLink} target="_blank" rel="noopener noreferrer"><Star size={16}/> Write a Google review</a>
      <a className="hv-button hv-button--ghost" href={gbp.url} target="_blank" rel="noopener noreferrer"><MapPin size={16}/> See us on Google <ArrowUpRight size={16}/></a>
      {!compact && <a className="gbp-card__call" href={contact.phoneHref}><Phone size={16}/> {contact.phone}</a>}
    </div>
  </aside></LocalizedContent>;
}

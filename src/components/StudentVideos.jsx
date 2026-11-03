
import LocalizedContent from '../i18n/LocalizedContent';
import LocalVideo from './LocalVideo';
import {studentVideos} from '../data/media';

/**
 * Students talking about the course and their results, including what they now earn. Shown with a note wherever it
 * appears: these are individual experiences, never a promise of income (ASCI expects that context with earnings stories).
 */
export default function StudentVideos({title = 'Students, on video', className = ''}) {
  return <LocalizedContent><div className={`student-videos ${className}`}>
    {title && <h3 className="student-videos__title">{title}</h3>}
    <ul>{studentVideos.map((v) => <li key={v.src}><LocalVideo {...v} label={`Student feedback · ${v.minutes}`}/></li>)}</ul>
    <p className="student-videos__note">Individual experiences shared by students, in their own words. Results depend on each person’s effort, time and circumstances; the courses do not guarantee clients or income.</p>
  </div></LocalizedContent>;
}

import LocalVideo from './LocalVideo';
import {studentVideos} from '../data/media';

/** Row of video feedback from course students, shown next to written reviews. */
export default function StudentVideos({title = 'Students, on video', className = ''}) {
  return <div className={`student-videos ${className}`}>
    {title && <h3 className="student-videos__title">{title}</h3>}
    <ul>{studentVideos.map((v) => <li key={v.src}><LocalVideo {...v} label={`Student feedback · ${v.minutes}`}/></li>)}</ul>
  </div>;
}

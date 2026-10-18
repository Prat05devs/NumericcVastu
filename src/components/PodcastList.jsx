'use client';
import {useState} from 'react';
import {ArrowUpRight, CalendarDays, Clock, Eye} from 'lucide-react';
import YouTubeInline from './YouTubeInline';
import {formatCount} from '../lib/formatCount';

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

/** Filterable podcast episodes, each playable in place with what Adarshh discussed. */
export default function PodcastList({episodes, topics}) {
  const [topic, setTopic] = useState('All');
  const list = topic === 'All' ? episodes : episodes.filter((e) => e.topics.includes(topic));
  const count = (t) => (t === 'All' ? episodes.length : episodes.filter((e) => e.topics.includes(t)).length);
  return <>
    <div className="pc-filters" role="group" aria-label="Filter episodes by topic">
      {['All', ...topics].map((t) => <button key={t} type="button" aria-pressed={topic === t} className={topic === t ? 'is-on' : ''} onClick={() => setTopic(t)}>{t}<span>{count(t)}</span></button>)}
    </div>
    <p className="pc-count" aria-live="polite">{list.length} {list.length === 1 ? 'episode' : 'episodes'}{topic === 'All' ? '' : ` on ${topic.toLowerCase()}`}</p>
    <ol className="pc-list">
      {list.map((e) => <li key={e.id} className="pc-card">
        <YouTubeInline id={e.id} title={`${e.title} — ${e.show}`} poster={`/images/podcasts/${e.id}.webp`}/>
        <div className="pc-card__body">
          <p className="pc-card__show"><b>{e.show}</b>{e.host && <> · with {e.host}</>}</p>
          <h3>{e.title}</h3>
          <ul className="pc-card__meta">
            <li><CalendarDays size={15} aria-hidden="true"/>{formatDate(e.date)}</li>
            <li><Clock size={15} aria-hidden="true"/>{e.minutes} min</li>
            {e.views >= 1000 && <li><Eye size={15} aria-hidden="true"/>{formatCount(e.views)} views</li>}
          </ul>
          <p className="pc-card__label">What he talked about</p>
          <ul className="pc-card__points">{e.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <a className="pc-card__yt" href={`https://www.youtube.com/watch?v=${e.id}`} target="_blank" rel="noopener noreferrer">Watch on YouTube <ArrowUpRight size={15}/></a>
        </div>
      </li>)}
    </ol>
  </>;
}

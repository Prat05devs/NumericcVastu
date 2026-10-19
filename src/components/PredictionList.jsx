'use client';
import {useState} from 'react';
import {ArrowUpRight, Check, Hourglass} from 'lucide-react';
import YouTubeInline from './YouTubeInline';

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const gap = (days) => (days < 45 ? `${days} days later` : days < 365 ? `${Math.round(days / 30)} months later` : `${(days / 365).toFixed(1)} years later`);

const FILTERS = [['all', 'All'], ['came-true', 'Came true'], ['awaiting', 'Awaiting result']];

/** Predictions with their source video, the date he said it, and (when it happened) the dated outcome with a news source. */
export default function PredictionList({items}) {
  const [filter, setFilter] = useState('all');
  const list = filter === 'all' ? items : items.filter((p) => p.status === filter);
  return <>
    <div className="pr-filters" role="group" aria-label="Filter predictions">
      {FILTERS.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>{label}<span>{key === 'all' ? items.length : items.filter((p) => p.status === key).length}</span></button>)}
    </div>
    <ol className="pr-list">
      {list.map((p) => {
        const done = p.status === 'came-true';
        return <li key={p.id} className={`pr-card ${done ? 'is-true' : 'is-awaiting'}`} id={p.id}>
          <div className="pr-card__body">
            <div className="pr-card__tags">
              <span className="pr-badge">{done ? <><Check size={15}/> Came true</> : <><Hourglass size={14}/> Awaiting result</>}</span>
              <span className="pr-area">{p.area}</span>
            </div>
            <h3>{p.title}</h3>
            <blockquote>{p.quote}</blockquote>
            <p className="pr-said">{p.said}</p>
            <ol className="pr-timeline">
              <li><small>Predicted</small><b>{formatDate(p.date)}</b><span>on video, published on YouTube</span></li>
              {done
                ? <li className="is-outcome"><small>Happened · {gap(daysBetween(p.date, p.outcome.date))}</small><b>{formatDate(p.outcome.date)}</b><span>{p.outcome.text} <a href={p.outcome.source} target="_blank" rel="noopener noreferrer">Source: {p.outcome.sourceName} <ArrowUpRight size={13}/></a></span></li>
                : <li className="is-pending"><small>Outcome</small><b>Still to come</b><span>We will mark this when it happens.</span></li>}
            </ol>
          </div>
          <YouTubeInline id={p.videoId} tall={p.format === 'short'} title={`Adarshh Panndey: ${p.title}`} poster={`/images/predictions/${p.videoId}.webp`} className="pr-card__video"/>
        </li>;
      })}
    </ol>
  </>;
}

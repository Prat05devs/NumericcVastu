import {KUA} from '../lib/numerology';
import LocalizedContent from '../i18n/LocalizedContent';

/** Same sourced direction table in the free reading and the combined downloadable report. */
export default function KuaDirections({kua}) {
  const entry=KUA[kua];
  if(!entry)return null;
  return <LocalizedContent><div className="nv-kua-directions">
    <table className="nv-direction-table"><caption className="sr-only">Four favourable directions by purpose</caption><thead><tr><th scope="col">Purpose</th><th scope="col">Direction</th></tr></thead><tbody>{entry.favourable.map(item=><tr key={item.key}><th scope="row">{item.label}<small>{item.traditional}</small></th><td>{item.direction}</td></tr>)}</tbody></table>
    <p className="nv-direction-note">Eight Mansions gives four favourable directions for different purposes. These are traditional associations, not guaranteed outcomes. Adarshh can review them alongside your complete chart.</p>
    <details className="nv-direction-sources"><summary>Direction method & sources</summary><p>Directions follow the Eight Mansions Kua table. They are not selected by the presence or absence of 6 or 8 in the birth-date grid. Kua uses the calendar birth year here; a Chinese solar-year method can differ for January and early-February births.</p><p><a href="https://www.fengshuied.com/kua-number" target="_blank" rel="noopener noreferrer">Eight Mansions direction table</a> · <a href="https://www.fengshuiweb.co.uk/wp-content/uploads/2012/04/eightmansions-1.pdf" target="_blank" rel="noopener noreferrer">Gua year and direction reference</a></p></details>
  </div></LocalizedContent>;
}

import LocalizedContent from '../../i18n/LocalizedContent';
import {SiteFooter} from '../../components/SiteChrome';
import ReportRecovery from '../../components/ReportRecovery';
import {contact} from '../../data/contact';
import {reportStyles} from '../../lib/reportStyles';

export const metadata = {title: 'Get your numerology report | NumericcVaastu', robots: {index: false, follow: false}};

/** Where a buyer (or the team, on their behalf) reopens a paid report on any device. */
export default function Page() {
  return <LocalizedContent><>
    <main id="main" className="hv co-page"><div className="hv-wrap fr-generator" style={{maxWidth: 720}}>
      <style>{reportStyles}</style>
      <span className="hv-eyebrow">Already paid?</span>
      <h1 className="hv-title">Get your numerology report</h1>
      <p>Enter the payment ID and the phone number you used. Your report opens straight away, on any phone or computer.</p>
      <ReportRecovery/>
      <p className="fr-status">Need help? Call or WhatsApp <a href={contact.phoneHref} translate="no">{contact.phone}</a> with your payment ID.</p>
    </div></main>
    <SiteFooter/>
  </></LocalizedContent>;
}

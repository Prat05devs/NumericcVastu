import {SiteFooter} from '../../../components/SiteChrome';
import CheckoutSuccess from '../../../components/CheckoutSuccess';
import {contact} from '../../../data/contact';

export const metadata = {title: 'Booking received | NumericcVaastu', robots: {index: false, follow: false}};

export default function Page() {
  return <>
    <main id="main" className="hv co-page"><div className="hv-wrap"><CheckoutSuccess whatsapp={contact.whatsapp} phone={contact.phone}/></div></main>
    <SiteFooter/>
  </>;
}

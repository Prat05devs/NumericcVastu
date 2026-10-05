import 'server-only';
import {createHash} from 'node:crypto';
import {offerCatalog,canCheckout,getPricePaise,type Offer} from '../data/offers';
/** Server-side resolution point for a future Razorpay order endpoint. Never accept price from a client request. */
export function resolveCheckoutOffer(offerId:string, now=new Date()):{offer:Offer;amount:number;currency:'INR';catalogVersion:string}{
 const offer=offerCatalog.offers.find(item=>item.id===offerId);
 if(!offer||!canCheckout(offer))throw new Error('Offer is unavailable for checkout');
 return {offer,amount:getPricePaise(offer,now),currency:offerCatalog.currency,catalogVersion:createHash('sha256').update(JSON.stringify({offers:offerCatalog.offers,promotions:offerCatalog.promotions})).digest('hex').slice(0,16)};
}

'use client';
import LocalizedContent from '../i18n/LocalizedContent';
import {getPrice, priceLabels, promoFor} from '../data/offers';
import {bestSale, money} from '../lib/saleMath';
import {useSales} from './SaleProvider';

/**
 * An offer's price in rupees and dollars; CSS shows the visitor's currency (lib/currency.js).
 * During a sale, or while an offer's own promotion runs (e.g. the report's Deepawali special), the comparison price
 * is struck through and the price paid stands out.
 */
export default function Price({offer, now}) {
  const sales = useSales();
  const labels = priceLabels(offer, now);
  const promo = promoFor(offer);
  const one = (currency) => {
    const list = getPrice(offer, currency);
    const best = list ? bestSale(sales, offer, list, currency) : null;
    if (best) return <><s className="nv-price-was">{money(list, currency)}</s> <span className="nv-price-sale">{money(best.finalMinor, currency)}</span></>;
    const was = currency === 'INR' ? promo?.wasPaise : promo?.wasUsdCents;
    if (was) return <><s className="nv-price-was">{money(was, currency)}</s> <span className="nv-price-sale nv-price-flash">{labels[currency]}</span></>;
    return labels[currency];
  };
  return <LocalizedContent><><span data-cur="INR">{one('INR')}</span><span data-cur="USD">{one('USD')}</span></></LocalizedContent>;
}

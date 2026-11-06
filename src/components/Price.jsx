'use client';
import LocalizedContent from '../i18n/LocalizedContent';
import {getPrice, priceLabels} from '../data/offers';
import {bestSale, money} from '../lib/saleMath';
import {useSales} from './SaleProvider';

/** An offer's price in rupees and dollars; CSS shows the visitor's currency (lib/currency.js). During a sale the list price is struck through. */
export default function Price({offer, now}) {
  const sales = useSales();
  const labels = priceLabels(offer, now);
  const one = (currency) => {
    const list = getPrice(offer, currency);
    const best = list ? bestSale(sales, offer, list, currency) : null;
    if (!best) return labels[currency];
    return <><s className="nv-price-was">{money(list, currency)}</s> <span className="nv-price-sale">{money(best.finalMinor, currency)}</span></>;
  };
  return <LocalizedContent><><span data-cur="INR">{one('INR')}</span><span data-cur="USD">{one('USD')}</span></></LocalizedContent>;
}

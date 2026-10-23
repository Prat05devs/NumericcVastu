import {priceLabels} from '../data/offers';

/** An offer's price in rupees and dollars; CSS shows the visitor's currency (lib/currency.js). */
export default function Price({offer, now}) {
  const labels = priceLabels(offer, now);
  return <><span data-cur="INR">{labels.INR}</span><span data-cur="USD">{labels.USD}</span></>;
}

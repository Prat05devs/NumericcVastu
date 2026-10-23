import {useSyncExternalStore} from 'react';

/** The visitor's currency, as set on <html> by lib/currency.js. Renders INR on the server and while hydrating. */
const subscribe = () => () => {};
export const useCurrency = () => useSyncExternalStore(subscribe, () => (document.documentElement.dataset.currency === 'USD' ? 'USD' : 'INR'), () => 'INR');

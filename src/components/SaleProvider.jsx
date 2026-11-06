'use client';
import {createContext, useContext} from 'react';

/** Running website sales, fetched once in the root layout and shared with every price and the top strip. */
const SaleContext = createContext([]);
export function SaleProvider({sales, children}) { return <SaleContext.Provider value={sales || []}>{children}</SaleContext.Provider>; }
export const useSales = () => useContext(SaleContext);

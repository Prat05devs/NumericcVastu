'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {cartCount, onCartChange} from '@/lib/cart';

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(cartCount()); return onCartChange(() => setCount(cartCount())); }, []);
  return (
    <Link href="/cart" className="ic" aria-label={`Cart${count ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path d="M6 7h12l1 14H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
      {count > 0 && <span className="n">{count}</span>}
    </Link>
  );
}

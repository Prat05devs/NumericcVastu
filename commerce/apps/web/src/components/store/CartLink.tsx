'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {cartCount, onCartChange} from '@/lib/cart';

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(cartCount()); return onCartChange(() => setCount(cartCount())); }, []);
  return <Link href="/cart" className="btn small">Cart{count ? ` (${count})` : ''}</Link>;
}

'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, AlertTriangle} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {whatsappUrl} from '../lib/whatsapp';

/** Shown after Razorpay returns. Reads the booking summary saved by the checkout in this tab. */
export default function CheckoutSuccess({whatsapp, phone}) {
  const [booking, setBooking] = useState(null);
  const [paid, setPaid] = useState(true);
  useEffect(() => {
    try { setBooking(JSON.parse(sessionStorage.getItem('nv-last-booking') || 'null')); } catch {}
    setPaid(new URLSearchParams(window.location.search).get('status') === 'paid');
  }, []);
  return <section className="co-done">
    {paid ? <CheckCircle2 size={56} className="co-done__icon"/> : <AlertTriangle size={56} className="co-done__icon is-warn"/>}
    <h1>{paid ? 'Payment received. Thank you!' : 'We’re confirming your payment'}</h1>
    {booking && <p className="co-done__what"><b>{booking.offer}</b> · {booking.price}</p>}
    <p>{paid
      ? booking?.kind === 'course' ? 'Your place is reserved. The team will share batch dates and access details on WhatsApp and email.' : 'Adarshh’s team will confirm your session time on WhatsApp.'
      : `Razorpay could not confirm the payment instantly. If money was deducted, it will be confirmed shortly or refunded automatically by your bank. Call ${phone} if you need help.`}</p>
    {booking?.paymentId && <p className="co-done__id">Payment ID: <code>{booking.paymentId}</code></p>}
    {booking?.message && <>
      <p><b>One last step:</b> send your details to Adarshh on WhatsApp so he can prepare.</p>
      <a className="hv-button hv-button--whatsapp" href={whatsappUrl(whatsapp, booking.message)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20}/> Send my details on WhatsApp</a>
    </>}
    <Link className="hv-link" href="/">Back to home</Link>
  </section>;
}

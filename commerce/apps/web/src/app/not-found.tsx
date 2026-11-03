import Link from 'next/link';
export default function NotFound() {
  return <main className="wrap" style={{marginTop: '4rem'}}><h1>Page not found</h1><p>This page does not exist or is not published yet. <Link href="/">Go to the shop</Link>.</p></main>;
}

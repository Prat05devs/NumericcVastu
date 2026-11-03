import Link from 'next/link';
export const metadata = {title: 'Partner programme', robots: {index: false}};
export default function PartnerLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <header className="site"><div className="wrap"><Link href="/" className="brand">NumericcVaastu <span>Partners</span></Link><nav className="main" /><Link href="/">Back to the shop</Link></div></header>
      <main id="content" className="wrap" style={{margin: '2rem auto'}}>{children}</main>
    </>
  );
}

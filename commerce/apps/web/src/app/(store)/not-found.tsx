import Link from 'next/link';
import {Art} from '@/components/store/ui';

export default function NotFound() {
  return (
    <div className="w" style={{paddingTop: 30}}>
      <div className="card empty"><span className="pic"><Art name="cluster" /></span><span className="pill">404</span><h1 className="disp">This page has moved</h1><p className="muted">The piece may have sold, or the link changed.</p><div className="row" style={{justifyContent: 'center'}}><Link className="btn" href="/shop">Go to the shop</Link><Link className="btn light" href="/search">Search</Link></div></div>
    </div>
  );
}

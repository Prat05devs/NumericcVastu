'use client';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {Award, Bell, CalendarCheck, ChartColumn, ChevronsUpDown, Cog, CreditCard, FileText, FolderTree, House, Layers, LayoutGrid, LockKeyhole, LogOut, Menu, MessageCircle, Package, Search, ShieldCheck, ShoppingBag, Sparkles, Tag, Truck, Undo2, UserCog, Users, Wallet, Watch, Settings, type LucideIcon} from 'lucide-react';
import {get, post} from '@/lib/client';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Sheet, SheetContent, SheetDescription, SheetTitle} from '@/components/ui/sheet';
import {CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from '@/components/ui/command';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

type Staff = {user: {id: string; email: string; name: string; role: string}; mfaVerified: boolean; permissions: string[]};
const Ctx = createContext<Staff | null>(null);
export const useStaff = () => useContext(Ctx)!;
export const useCan = () => { const s = useContext(Ctx); return (p: string) => Boolean(s?.permissions.includes(p)); };

type CountKey = 'newBookings' | 'openCustomRequests' | 'newConsultationLeads' | 'toShip';
type NavItem = {href: string; text: string; perm: string; icon: LucideIcon; count?: CountKey};
const NAV: [string, NavItem[]][] = [
  ['Sell', [
    {href: '/admin', text: 'Overview', perm: 'overview.read', icon: House},
    {href: '/admin/bookings', text: 'Website bookings', perm: 'requests.read', icon: CalendarCheck, count: 'newBookings'},
    {href: '/admin/orders', text: 'Shop orders', perm: 'orders.read', icon: ShoppingBag, count: 'toShip'},
    {href: '/admin/returns', text: 'Returns', perm: 'orders.read', icon: Undo2},
    {href: '/admin/delivery', text: 'Delivery feedback', perm: 'orders.read', icon: Truck},
    {href: '/admin/requests', text: 'Wristwatch requests', perm: 'requests.read', icon: Watch, count: 'openCustomRequests'},
    {href: '/admin/consultations', text: 'Consultation enquiries', perm: 'requests.read', icon: MessageCircle, count: 'newConsultationLeads'},
  ]],
  ['Catalogue', [
    {href: '/admin/products', text: 'Products', perm: 'catalogue.read', icon: Package},
    {href: '/admin/inventory', text: 'Stock', perm: 'catalogue.read', icon: Layers},
    {href: '/admin/categories', text: 'Categories & filters', perm: 'catalogue.read', icon: FolderTree},
    {href: '/admin/collections', text: 'Collections', perm: 'catalogue.read', icon: LayoutGrid},
    {href: '/admin/certificates', text: 'Lab reports', perm: 'catalogue.read', icon: Award},
  ]],
  ['Grow', [
    {href: '/admin/coupons', text: 'Coupons', perm: 'marketing.write', icon: Tag},
    {href: '/admin/campaigns', text: 'Sales & festive themes', perm: 'marketing.write', icon: Sparkles},
    {href: '/admin/partners', text: 'Partners (affiliates)', perm: 'marketing.write', icon: Users},
    {href: '/admin/payouts', text: 'Partner payouts', perm: 'reports.read', icon: Wallet},
    {href: '/admin/content', text: 'Pages, guides & reviews', perm: 'cms.write', icon: FileText},
  ]],
  ['Run', [
    {href: '/admin/reports', text: 'Reports', perm: 'reports.read', icon: ChartColumn},
    {href: '/admin/settings', text: 'Settings', perm: 'settings.read', icon: Settings},
    {href: '/admin/payments', text: 'Payments setup', perm: 'payments.mode', icon: CreditCard},
    {href: '/admin/staff', text: 'Staff', perm: 'staff.manage', icon: UserCog},
    {href: '/admin/jobs', text: 'Jobs & webhooks', perm: 'settings.read', icon: Cog},
    {href: '/admin/audit', text: 'Audit log', perm: 'audit.read', icon: ShieldCheck},
  ]],
];
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'NV';
const roleLabel = (role: string) => role.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Brand() {
  return <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-1 no-underline">
    <span className="grid size-[38px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-deep to-primary text-[13px] font-extrabold tracking-wide text-white shadow-[inset_0_-2px_0_var(--gold)]">NV</span>
    <span className="leading-none"><b className="block font-serif text-[19px] font-bold text-deep">NumericcVaastu</b><small className="mt-1 block text-[10.5px] font-extrabold tracking-[.16em] text-[#8c6a12] uppercase">Back office</small></span>
  </Link>;
}

function Nav({groups, current, counts}: {groups: [string, NavItem[]][]; current?: string; counts: Partial<Record<CountKey, number>>}) {
  return <nav aria-label="Back office" className="flex flex-col gap-4">
    {groups.map(([group, items]) => <div key={group}>
      <p className="mb-1.5 px-2.5 text-[11px] font-extrabold tracking-[.14em] text-[#9a93a6] uppercase">{group}</p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = current === item.href;
          const n = item.count ? counts[item.count] : 0;
          return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
            className={cn('relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold text-sidebar-foreground no-underline transition-colors hover:bg-sidebar-accent hover:text-deep', active && 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:top-2 before:bottom-2 before:-left-3.5 before:w-[3px] before:rounded-r before:bg-sindoor')}>
            <item.icon className={cn('size-[18px] shrink-0 text-[#8a8298]', active && 'text-primary')} aria-hidden="true" />
            <span className="truncate">{item.text}</span>
            {n ? <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-sindoor px-1.5 text-[11.5px] font-extrabold text-white">{n}</span> : null}
          </Link>;
        })}
      </div>
    </div>)}
  </nav>;
}

function Me({staff, onSignOut}: {staff: Staff; onSignOut: () => void}) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-secondary p-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-extrabold text-deep">{initials(staff.user.name)}</span>
        <span className="min-w-0 flex-1 leading-tight"><b className="block truncate text-[13.5px] text-deep">{staff.user.name}</b><small className="text-xs text-muted-foreground">{roleLabel(staff.user.role)}</small></span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" side="top" className="w-60">
      <DropdownMenuLabel><span className="block font-bold">{staff.user.name}</span><span className="block truncate text-xs text-muted-foreground">{staff.user.email}</span></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onSignOut}><LogOut aria-hidden="true" /> Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function Shell({children}: {children: React.ReactNode}) {
  const [staff, setStaff] = useState<Staff | null | undefined>(undefined);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<CountKey, number>>>({});
  const path = usePathname();
  const router = useRouter();
  const load = useCallback(async () => { const r = await get<Staff>('/auth/staff/me'); setStaff(r.ok ? r.data : null); }, []);
  useEffect(() => { void load(); }, [load]);
  // Live counts for the menu and the bell, refreshed on every page change and every two minutes.
  useEffect(() => {
    if (!staff?.mfaVerified || !staff.permissions.includes('overview.read')) return;
    let gone = false;
    const refresh = async () => { const r = await get<{queues: Record<CountKey, number>}>('/admin/overview'); if (r.ok && !gone) setCounts(r.data.queues); };
    void refresh();
    const t = setInterval(refresh, 120_000);
    return () => { gone = true; clearInterval(t); };
  }, [staff, path]);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((s) => !s); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const signOut = async () => { await post('/auth/staff/logout'); setStaff(null); };

  if (staff === undefined) return <div className="nva grid min-h-screen place-items-center bg-background font-sans text-muted-foreground">Loading the back office…</div>;
  if (staff === null) return <AuthScreen><Login onDone={load} /></AuthScreen>;
  if (!staff.mfaVerified) return <AuthScreen><MfaSetup onDone={load} /></AuthScreen>;

  const groups = NAV.map(([g, items]) => [g, items.filter((i) => staff.permissions.includes(i.perm))] as [string, NavItem[]]).filter(([, items]) => items.length);
  const all = groups.flatMap(([, items]) => items);
  const current = all.filter((i) => path === i.href || (i.href !== '/admin' && path.startsWith(i.href))).sort((a, b) => b.href.length - a.href.length)[0];
  const sidebar = <div className="flex h-full flex-col gap-5 overflow-y-auto px-3.5 py-5"><Brand /><Nav groups={groups} current={current?.href} counts={counts} /><div className="mt-auto"><Me staff={staff} onSignOut={signOut} /></div></div>;

  return (
    <Ctx.Provider value={staff}>
      <div className="nva min-h-screen bg-background font-sans text-foreground lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-sidebar-border bg-sidebar lg:block" aria-label="Back office menu">{sidebar}</aside>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="left" className="bg-sidebar p-0"><SheetTitle>Menu</SheetTitle><SheetDescription>Back office pages</SheetDescription>{sidebar}</SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}><Menu /></Button>
            <h1 className="m-0 hidden truncate text-xl font-extrabold text-deep sm:block">{current?.text ?? 'Back office'}</h1>
            <button onClick={() => setSearch(true)} className="ml-auto flex h-10 w-full max-w-[340px] cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 text-sm text-muted-foreground shadow-xs hover:bg-accent sm:w-[300px]">
              <Search className="size-4" aria-hidden="true" /><span className="flex-1 text-left">Search pages…</span><kbd className="hidden rounded border bg-background px-1.5 text-[11px] font-semibold sm:inline">⌘K</kbd>
            </button>
            {staff.permissions.includes('requests.read') && <Button variant="outline" size="icon" asChild className="relative shrink-0">
              <Link href="/admin/bookings" aria-label={`New paid website bookings: ${counts.newBookings ?? 0}`} title="New paid website bookings"><Bell />{counts.newBookings ? <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-sindoor px-1 text-[11px] font-extrabold text-white">{counts.newBookings}</span> : null}</Link>
            </Button>}
          </header>
          <main id="content" className="grid content-start gap-5 p-4 sm:p-6 lg:p-8 [&>*]:min-w-0">{children}</main>
        </div>
        <CommandDialog open={search} onOpenChange={setSearch}>
          <CommandInput placeholder="Go to a page…" />
          <CommandList>
            <CommandEmpty>No page found.</CommandEmpty>
            {groups.map(([group, items]) => <CommandGroup key={group} heading={group}>
              {items.map((i) => <CommandItem key={i.href} value={`${i.text} ${group}`} onSelect={() => { setSearch(false); router.push(i.href); }}><i.icon aria-hidden="true" />{i.text}</CommandItem>)}
            </CommandGroup>)}
          </CommandList>
        </CommandDialog>
      </div>
    </Ctx.Provider>
  );
}

function AuthScreen({children}: {children: React.ReactNode}) {
  return <div className="nva grid min-h-screen place-items-center bg-[radial-gradient(1200px_500px_at_50%_-10%,#ece3f7,transparent),var(--background)] px-4 py-8 font-sans text-foreground">{children}</div>;
}

function Login({onDone}: {onDone: () => void}) {
  const [f, setF] = useState({email: '', password: '', totp: ''});
  const [needTotp, setNeedTotp] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setBusy(true);
    const r = await post('/auth/staff/login', {email: f.email, password: f.password, ...(f.totp && {totp: f.totp})});
    setBusy(false);
    if (r.ok) return onDone();
    if (r.error.code === 'MFA_REQUIRED') { setNeedTotp(true); return setMsg(''); }
    setMsg(r.error.message);
  }
  return <Card className="w-full max-w-[440px] gap-6 py-8">
    <CardHeader className="gap-5 px-7"><Brand /><div><CardTitle className="text-[26px]">{needTotp ? 'Enter your code' : 'Welcome back'}</CardTitle><CardDescription className="mt-1 text-[15px]">{needTotp ? 'Open your authenticator app and type the 6-digit code for NumericcVaastu.' : 'Sign in to manage bookings, orders and the shop.'}</CardDescription></div></CardHeader>
    <CardContent className="px-7">
      <form onSubmit={submit} className="grid gap-4">
        {!needTotp && <>
          <div className="grid gap-1.5"><label htmlFor="se" className="text-sm font-bold">Email</label><Input id="se" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({...f, email: e.target.value})} required /></div>
          <div className="grid gap-1.5"><label htmlFor="sp" className="text-sm font-bold">Password</label><Input id="sp" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({...f, password: e.target.value})} required /></div>
        </>}
        {needTotp && <div className="grid gap-1.5"><label htmlFor="st" className="text-sm font-bold">Authenticator code</label><Input id="st" inputMode="numeric" autoComplete="one-time-code" autoFocus className="h-14 text-center text-2xl tracking-[.5em] tabular-nums" value={f.totp} onChange={(e) => setF({...f, totp: e.target.value.replace(/\D/g, '').slice(0, 6)})} required /></div>}
        {msg && <p className="m-0 text-sm font-semibold text-destructive" role="alert">{msg}</p>}
        <Button size="lg" disabled={busy}><LockKeyhole /> {busy ? 'Please wait…' : needTotp ? 'Verify and sign in' : 'Sign in'}</Button>
        {needTotp ? <Button type="button" variant="ghost" onClick={() => { setNeedTotp(false); setF({...f, totp: ''}); }}>Use a different account</Button> : <p className="m-0 text-center text-xs text-muted-foreground">Protected with a 2-step code from your authenticator app.</p>}
      </form>
    </CardContent>
  </Card>;
}

function MfaSetup({onDone}: {onDone: () => void}) {
  const [setup, setSetup] = useState<{secret: string; otpauthUri: string} | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!setup) return;
    void import('qrcode').then((QR) => QR.toDataURL(setup.otpauthUri, {margin: 1, width: 220})).then(setQr).catch(() => setQr(''));
  }, [setup]);
  return <Card className="w-full max-w-[560px] py-8">
    <CardHeader className="gap-5 px-7"><Brand /><div><CardTitle className="text-2xl">Set up two-step sign-in</CardTitle><CardDescription className="mt-1 text-[15px]">The back office needs an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</CardDescription></div></CardHeader>
    <CardContent className="grid gap-4 px-7 text-[15px]">
      {!setup ? <Button className="w-fit" onClick={async () => { const r = await post<{secret: string; otpauthUri: string}>('/auth/staff/mfa/setup'); if (r.ok) setSetup(r.data); else setMsg(r.error.message); }}>Start setup</Button> : <>
        <p className="m-0"><strong>Easiest:</strong> in Google Authenticator tap <strong>+</strong> → <strong>Scan a QR code</strong> and scan this:</p>
        {qr && <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-xl border" />}
        <p className="m-0 text-sm text-muted-foreground">Or tap <strong>+</strong> → <strong>Enter a setup key</strong>, choose <strong>Time based</strong>, and type this key. It uses letters A–Z and the digits 2–7 only, so every “O” is the letter O (never zero) and every “I” is the letter I (never one):</p>
        <pre aria-label="Setup key" className="m-0 overflow-auto rounded-lg bg-secondary p-3 font-mono tracking-[.08em]">{setup.secret.match(/.{1,4}/g)?.join(' ')}</pre>
        <form className="flex flex-wrap gap-2.5" onSubmit={async (e) => { e.preventDefault(); const r = await post('/auth/staff/mfa/confirm', {code}); if (r.ok) onDone(); else setMsg(r.error.message); }}>
          <Input inputMode="numeric" aria-label="6-digit code" placeholder="6-digit code from the app" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="max-w-[220px]" />
          <Button>Confirm</Button>
        </form>
      </>}
      {msg && <p className="m-0 text-sm font-semibold text-destructive" role="alert">{msg}</p>}
    </CardContent>
  </Card>;
}

'use client';
import {useResource, Loading, SpecForm, type Spec} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {call} from '@/lib/client';

type S = {values: Record<string, Record<string, unknown> | null>; missing: string[]; optional: string[]; aiKeys: Record<string, {set: boolean; last4: string}>; storefronts: {id: string; name: string; baseUrl: string; allowedOrigins: string[]}[]};

/** Every settings group is declared once here and rendered by the shared form; the API validates and audits each save. */
const GROUPS: {key: string; title: string; intro: string; specs: Spec[]; defaults: Record<string, unknown>}[] = [
  {key: 'tax', title: 'Tax', intro: 'Enter the rates your tax adviser confirms for each product group. Products reference a group by its code. Live payments stay locked until this is reviewed.', defaults: {mode: 'INCLUSIVE', groups: {}, shippingGroup: null},
    specs: [{key: 'mode', label: 'Prices are', hint: 'Inclusive = product ke price mein GST pehle se shaamil (hamare shop mein yahi).', type: 'select', options: [['INCLUSIVE', 'Inclusive of tax'], ['EXCLUSIVE', 'Exclusive (tax added at checkout)']]}, {key: 'groups', label: 'Tax groups', hint: 'GST rate har group ke liye, jaise gemstone 3%. CA se confirm karke daalo.', type: 'map', keyLabel: 'Group code (e.g. GST_3)', valueType: 'percent'}, {key: 'shippingGroup', label: 'Tax group for delivery charges (optional)', hint: 'Optional. Delivery free hai toh khaali chhodo.', type: 'text'}, {key: 'reviewedBy', label: 'Reviewed by (adviser)', type: 'text'}, {key: 'reviewedOn', label: 'Reviewed on', type: 'date'}]},
  {key: 'shipping', title: 'Delivery', intro: 'Delivery options shown at checkout, couriers you ship with (for tracking links), and how long stock is held while a customer pays.', defaults: {methods: [], couriers: [], holdMinutes: 15},
    specs: [{key: 'methods', label: 'Delivery options', hint: 'Hamare liye ek hi option: Fee ₹0, label “Insured delivery (included)”.', type: 'rows', addLabel: 'Add option', fields: [{key: 'id', label: 'Id (e.g. standard)', hint: 'Chhota andar ka naam, jaise included.', type: 'text'}, {key: 'label', label: 'Label', type: 'text'}, {key: 'feePaise', label: 'Fee (₹)', hint: 'Delivery charge. Hamare shop mein 0, kyunki price mein shaamil hai.', type: 'money'}, {key: 'freeAbovePaise', label: 'Free above (₹)', hint: 'Itne ₹ ke upar delivery free. Fee 0 hai toh khaali.', type: 'money', nullable: true}, {key: 'etaText', label: 'Delivery time text', hint: 'Checkout par dikhega, jaise 3–7 working days.', type: 'text'}, {key: 'active', label: 'Active', type: 'bool'}]},
      {key: 'couriers', label: 'Couriers', type: 'rows', addLabel: 'Add courier', hint: 'Tracking page URL with {tracking} where the number goes, e.g. https://www.delhivery.com/track/package/{tracking}', fields: [{key: 'id', label: 'Id', type: 'text'}, {key: 'name', label: 'Name', type: 'text'}, {key: 'trackingUrlTemplate', label: 'Tracking URL', hint: 'Courier ka tracking link, number ki jagah {tracking} likho.', type: 'text'}]},
      {key: 'holdMinutes', label: 'Hold stock for (minutes) while paying', hint: 'Payment karte waqt item kitni der customer ke liye rukega. 15 theek hai.', type: 'number', min: 5, max: 120}]},
  {key: 'returns', title: 'Returns', intro: 'Returns are offered only when enabled here and the returns policy page is published.', defaults: {enabled: false, windowDays: 7, policyPageSlug: 'returns-policy'},
    specs: [{key: 'enabled', label: 'Accept return requests', hint: 'Tick karo toh customer order page se return maang sakta hai.', type: 'bool'}, {key: 'windowDays', label: 'Days after delivery', hint: 'Delivery ke kitne din tak return. Client se confirm karke daalo.', type: 'number', min: 1, max: 90}, {key: 'policyPageSlug', label: 'Policy page slug', hint: 'Returns page ka slug, normally returns-policy.', type: 'text'}, {key: 'reviewedBy', label: 'Reviewed by', type: 'text'}]},
  {key: 'invoice', title: 'Invoices', intro: 'Customers can download invoices only once your registered details are entered.', defaults: {},
    specs: [{key: 'sellerLegalName', label: 'Registered business name', hint: 'GST certificate par jo naam hai, wahi. Invoice par chhapta hai.', type: 'text'}, {key: 'gstin', label: 'GSTIN (if registered)', hint: '15 akshar ka GST number. Invoice par chhapta hai.', type: 'text'}, {key: 'address', label: 'Registered address', hint: 'GST registration wala address.', type: 'textarea'}, {key: 'invoicePrefix', label: 'Invoice number prefix', hint: 'Invoice number ke aage, jaise NVC/25-26/.', type: 'text'}]},
  {key: 'affiliates', title: 'Partner programme', intro: 'Hold period (cover your return window), minimum payout, and tax deduction on commission — set the TDS rate and threshold only as advised by your accountant.', defaults: {holdDays: 14, minPayoutPaise: '50000', tdsRateBp: null, tdsThresholdPaise: null, termsVersion: 'v1', termsPageSlug: 'partner-terms'},
    specs: [{key: 'holdDays', label: 'Hold commission for (days after delivery)', hint: 'Delivery ke itne din baad hi commission pakka hoga (return window jitna).', type: 'number', min: 0, max: 120}, {key: 'minPayoutPaise', label: 'Minimum payout (₹)', hint: 'Itna jama hone par hi partner ko payout.', type: 'money'}, {key: 'tdsRateBp', label: 'TDS rate % (blank = not deducted)', hint: 'CA se poochh kar daalo. Khaali = TDS nahi katega.', type: 'percent'}, {key: 'tdsThresholdPaise', label: 'Yearly TDS threshold (₹)', hint: 'Saal mein itne ₹ ke upar hi TDS kategi.', type: 'money', nullable: true}, {key: 'termsVersion', label: 'Current terms version', type: 'text', hint: 'Changing it asks every partner to accept again.'}, {key: 'termsPageSlug', label: 'Terms page slug', hint: 'Partner terms wale page ka slug.', type: 'text'}, {key: 'reviewedBy', label: 'Reviewed by', type: 'text'}]},
  {key: 'international', title: 'International (PayPal, USD)', intro: 'PayPal charges overseas buyers in USD. Enter the rupees-per-dollar rate you want to use; review it regularly. The rate used is stored on every payment.', defaults: {currency: 'USD'},
    specs: [{key: 'inrPerUnit', label: '₹ per 1 USD', hint: 'Dollar ka rate jo PayPal payment mein lagega, jaise 88.', type: 'text'}, {key: 'reviewedBy', label: 'Reviewed by', type: 'text'}, {key: 'reviewedOn', label: 'Reviewed on', type: 'date'}]},
  {key: 'consultation', title: 'Consultation enquiries', intro: 'Enquiry types offered on the site.', defaults: {topics: [], note: ''},
    specs: [{key: 'topics', label: 'Topics', type: 'rows', fields: [{key: 'id', label: 'Type', type: 'select', options: [['NUMEROLOGY', 'Numerology'], ['VASTU', 'Vastu'], ['PRODUCT_GUIDANCE', 'Product guidance'], ['OTHER', 'Other']]}, {key: 'label', label: 'Label', type: 'text'}, {key: 'description', label: 'Description', type: 'text'}]}, {key: 'note', label: 'Note shown on the form', hint: 'Enquiry form ke neeche chhoti line.', type: 'text'}]},
  {key: 'catalogue', title: 'Catalogue', intro: 'Low-stock alerts, and whether demo fixtures may be published (staging only).', defaults: {allowDemoPublish: false, lowStockThreshold: 2},
    specs: [{key: 'lowStockThreshold', label: 'Low-stock threshold', hint: 'Stock isse kam hua toh Overview par “Low stock” alert.', type: 'number', min: 0}, {key: 'allowDemoPublish', label: 'Allow demo products to be published (never on the live site)', hint: 'Live shop ke liye hamesha band rakho.', type: 'bool'}]},
  {key: 'siteEvents', title: 'Website events', intro: 'Adarshh’s own workshops, live sessions and course batches. They appear in the calendar on numericcvaastu.com/horoscope next to festivals and vrat days.', defaults: {events: []},
    specs: [{key: 'events', label: 'Events', type: 'rows', addLabel: 'Add event', hint: 'Har event ke liye date, naam aur chaaho toh time aur link daalo. Purane events apne aap hat jaate hain.', fields: [{key: 'date', label: 'Date (YYYY-MM-DD)', type: 'text', hint: 'Jaise 2026-11-21.'}, {key: 'title', label: 'Title', type: 'text', hint: 'Jaise Free live session: Numbers & Diwali.'}, {key: 'time', label: 'Time (optional)', type: 'text', hint: 'Jaise 7:00 PM IST.'}, {key: 'detail', label: 'Short detail (optional)', type: 'text', hint: 'Ek line, jaise Instagram Live par.'}, {key: 'link', label: 'Link (optional)', type: 'text', hint: 'Register ya join karne ka link.'}]}]},
  {key: 'navigation', title: 'Navigation highlights', intro: 'Extra links in the shop menu.', defaults: {highlights: []},
    specs: [{key: 'highlights', label: 'Links', type: 'rows', fields: [{key: 'label', label: 'Label', type: 'text'}, {key: 'href', label: 'Link', type: 'text'}]}]},
];
const AI = [['anthropic', 'Anthropic (Claude)'], ['openai', 'OpenAI'], ['google', 'Google (Gemini)'], ['deepseek', 'DeepSeek'], ['moonshot', 'Moonshot (Kimi)']];

export default function Settings() {
  const can = useCan();
  const {data, error, loading, reload} = useResource<S>('/admin/settings');
  if (!data) return <Loading error={error} loading={loading} />;
  return (
    <div className="stack">
      <h1>Settings</h1>
      {data.missing.length > 0 && <div className="alert warn">Not configured yet: {data.missing.join(', ')}. Nothing is assumed for these — checkout and invoices stay limited until they are entered.</div>}
      {GROUPS.map((g) => (
        <details key={g.key} className="card" open={data.missing.includes(g.key)}>
          <summary><strong>{g.title}</strong> {data.values[g.key] ? <span className="badge">Configured</span> : <span className="badge grey">Not set</span>}</summary>
          <p className="small muted">{g.intro}</p>
          {can('settings.write') ? <SpecForm idPrefix={g.key} specs={g.specs} initial={(data.values[g.key] ?? g.defaults) as Record<string, unknown>} onSubmit={async (v) => { const r = await call('PUT', `/admin/settings/${g.key}`, v); if (r.ok) reload(); return r; }} /> : <pre className="code">{JSON.stringify(data.values[g.key], null, 2)}</pre>}
        </details>
      ))}
      <details className="card"><summary><strong>AI assistants</strong></summary>
        <p className="small muted">Keys are stored encrypted and never shown again; only the last 4 characters are displayed.</p>
        {AI.map(([id, name]) => {
          const cur = (data.values['ai'] as Record<string, {model: string | null; enabled: boolean}> | null)?.[id!];
          const key = data.aiKeys[`ai.${id}.api_key`];
          return <div key={id} className="rowedit" style={{marginBottom: '.75rem'}}><SpecForm idPrefix={`ai-${id}`} initial={{provider: id, model: cur?.model ?? '', enabled: cur?.enabled ?? false}} submitLabel={`Save ${name}`}
            specs={[{key: 'apiKey', label: `${name} API key ${key ? `(set, …${key.last4})` : '(not set)'}`, type: 'text'}, {key: 'model', label: 'Model', type: 'text'}, {key: 'enabled', label: 'Enabled', type: 'bool'}, {key: 'removeKey', label: 'Remove the stored key', type: 'bool'}]}
            onSubmit={async (v) => { const r = await call('PATCH', '/admin/settings/ai', {provider: id, ...(v['apiKey'] ? {apiKey: v['apiKey']} : {}), model: v['model'] || undefined, enabled: Boolean(v['enabled']), removeKey: Boolean(v['removeKey'])}); if (r.ok) reload(); return r; }} /></div>;
        })}
      </details>
      <details className="card"><summary><strong>Storefronts</strong></summary>
        {data.storefronts.map((s) => <div key={s.id} style={{marginBottom: '1rem'}}><SpecForm idPrefix={`sf-${s.id}`} initial={{name: s.name, baseUrl: s.baseUrl, origins: s.allowedOrigins.join('\n')}} submitLabel={`Save ${s.id}`} specs={[{key: 'name', label: 'Name', type: 'text'}, {key: 'baseUrl', label: 'Base URL', type: 'url'}, {key: 'origins', label: 'Allowed origins (one per line)', hint: 'Har line par ek website address jise access dena hai.', type: 'textarea'}]}
          onSubmit={async (v) => { const r = await call('PATCH', `/admin/storefronts/${s.id}`, {name: v['name'], baseUrl: v['baseUrl'], allowedOrigins: String(v['origins']).split('\n').map((o) => o.trim()).filter(Boolean)}); if (r.ok) reload(); return r; }} /></div>)}
      </details>
    </div>
  );
}

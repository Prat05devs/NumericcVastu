# NumericcVaastu

A responsive Next.js site for Adarshh Panndey’s consultation and education brand. The homepage, multipage routes, founder image library, journal, structured metadata, XML sitemap, robots policy, and booking enquiry are in the project.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000 (or the port reported by Next.js). Use `npm run build` for a production check and `npm test` for browser tests.

## Edit offers and prices

**[`src/data/offers.ts`](src/data/offers.ts) is the only commercial catalogue.** Courses, consultations, pricing cards, homepage previews, enquiry selection, and future checkout price resolution depend on it. See [the offer editing and Razorpay guide](docs/OFFERS.md). Source prices are awaiting confirmation, so live payment stays off for every offer until its price is verified.

## Contact and hosting configuration

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_SITE_URL` is the canonical production origin. The booking enquiry prepares a WhatsApp message locally; the visitor chooses whether to send it. Calculator profiles and reports stay in browser memory. Checkout sends booking details to the server and configured payment providers. `NEXT_PUBLIC_BOOKING_URL` is retained from the earlier prototype but the new booking page owns the current journey.

The image assets downloaded from the former site are in `public/images/adarshh/`; their provenance is in `docs/existing-site-assets.json`. Confirm captions and permissions for people at certificate events before adding names. Use the owner-confirmed name “Adarshh Panndey” everywhere in website copy. Existing image filenames retain their original `adarshh-pandey-` slug.

## Loader preview

Visit `/loader-preview` to review a NumericcVaastu adaptation of Aceternity’s Multi Step Loader. The preview simulates booking, enrolment and report preparation. In production, pass a **controlled** `value` and `status` from the actual process. The underlying request must decide when the loader completes. The component lives in `src/components/ui/multi-step-loader.tsx` and supports `loadingStates`, `loading`, `duration`, `loop`, `value`, `status` and `onClose`.

The provided shadcn installer could not complete because automatic approval review reported a usage limit. The supplied component source was integrated manually in the requested `components/ui` structure and adapted to the brand. TypeScript and Tailwind v4 support were added without resetting the existing CSS.

## Content and launch

The site plan is in [docs/WEBSITE-PLAN.md](docs/WEBSITE-PLAN.md). Course prices, schedule, syllabus, certification, testimonial attribution, business contacts, and commercial policies need owner review. Legal pages are marked `noindex` until approved. Online payment runs through Razorpay (India) and PayPal (other countries); configure the keys from `.env.example`. Publish after reviewing all content and replacing draft policy text with approved terms.

## Calculator, full report and languages

The calculator now collects name, national phone number, date of birth and optional Kua gender. It shows separate Lo Shu and Vedic numerology kundlis, source digits, birth-date calculations, Chaldean name totals and a phone-total compatibility evaluation. The full report uses those same inputs and is free during testing. Download a self-contained HTML copy or choose **Print / save PDF**. Names and phone numbers stay in browser memory.

See [calculation references and differences requiring review](docs/NUMEROLOGY-METHODS.md), including the Biyyani sample fixtures and the missing full phone/Vedic specification. Charging later requires a verified report entitlement and protected delivery flow.

Use the navigation **EN / हिं** button to switch the interface and report between English and Hindi. The choice persists locally. See [localization conventions](docs/LOCALIZATION.md). Original quotations and external provider content retain their own language.

Checks: `npm run test:numerology`, `npm run typecheck`, `npm run build`, `npm run test:catalogue` (after building), and `npm test`.

The grouped header and page search are documented in [docs/NAVIGATION.md](docs/NAVIGATION.md). Use `npm run build` followed by `npx playwright test --config=playwright.production.config.js` for a complete browser check against production on port 3002. The development preview remains on port 3001.

## Search, local and AI visibility

The site works on `www.numericcvaastu.com`, `.in` and `.org`; each domain stays on its own address, and every page's canonical link points to `.com` so search engines list one domain. Page titles, descriptions and keywords live in `src/data/seo.js`, local landing pages (Delhi, Rohini, Delhi NCR, Noida, Gurugram, North India, online/international and Vastu) in `src/data/locations.js`, and the Google Business Profile link in `src/data/contact.js`. Structured data comes from `src/lib/schema.js`; `/llms.txt`, `robots.txt` and `sitemap.xml` are generated from the same data. The Shop menu opens the crystal store, numericcvaastucrystal.in; its categories are in `src/data/shop.js`. Instagram counts refresh every five days once the API token is set ([docs/INSTAGRAM.md](docs/INSTAGRAM.md)). See [docs/SEO-KEYWORDS.md](docs/SEO-KEYWORDS.md) for the keyword map, name spellings and the off-site checklist.

## Back office (backend)

`backend/` is a separate Next.js app: the back office dashboard and the commerce API shared by this website and numericcvaastucrystal.in. Coupons, affiliate links, festive sales and their decorations, Razorpay and PayPal test and live keys, and AI model keys are managed there instead of in code. Run it with `cd backend && npm install && npm run dev` (port 4000). See [backend/README.md](backend/README.md) and the design in [docs/BACKEND.md](docs/BACKEND.md). The website does not call it yet.


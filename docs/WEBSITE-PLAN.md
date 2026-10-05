# NumericcVaastu: multipage website and search plan

Status: implementation in progress, updated 1 October 2026. The multipage Next.js site, central offer catalogue, founder imagery, enquiry flow, journal, site maps, robots policy, metadata and structured data are implemented. Live scheduling, payments and business-approved content/policies remain pending.

## 1. Direction and scope

Keep the approved Next.js site, warm ivory, terracotta, wine, Manrope/Cormorant typography, floral dividers, and restrained temple linework. Make Adarshh the visible human connection across the site. Separate two clear journeys: personal consultation and professional learning.

Primary navigation: **About · Consultations · Courses · Stories · Gallery · Journal** with **Book a consultation** as the persistent CTA. Stories opens Testimonials, Gallery, and Media. Legal and utility links belong in the footer. On mobile, show a compact header and accessible menu; show a contextual bottom CTA on course and service detail pages when it does not obscure content.

Use **Adarshh Pandey**, as supplied by the owner. The old site uses “Adarshh Panndey”; resolve this spelling before metadata, author pages, social profiles, and structured data are finalized. NumericcVaastu remains the consistent brand spelling.

## 2. Page map and conversion purpose

| Route | Page contents and role | Main action | Priority |
|---|---|---|---|
| `/` | Short brand promise, founder portrait, two paths, selected courses/services, credible proof, short FAQs | Explore courses | Launch |
| `/about` | Adarshh’s biography, approach, dated journey, qualifications with evidence, book and media references | Meet Adarshh through a consultation | Launch |
| `/courses` | All three courses, learning progression, audience/level comparison, instructor introduction | View course | Launch |
| `/courses/numerology-career-launchpad` | Entry-level course detail using the shared template below | Enquire / enrol when checkout is ready | Launch |
| `/courses/numerology-income-accelerator` | Advanced course detail; clear prerequisites and scope | Enquire / apply | Launch |
| `/courses/numerology-legacy-mastery` | Mentoring/leadership program detail; selection and commitment | Apply for the program | Launch |
| `/pricing` | Retired (October 2026): fees already appear on course pages and consultation cards, so a separate price list only repeated them. Permanently redirects to `/courses` | — | Retired |
| `/consultations` | Service categories, suitability, process, practitioner introduction, preparation | View service or book | Launch |
| `/consultations/[slug]` | One substantive page per confirmed service; no thin duplicate pages | Book this consultation | Launch in batches |
| `/book-consultation` | Service selection and booking flow; both supported alternatives below | Submit booking / enquiry | Launch |
| `/testimonials` | Attributed client/student experiences, text/video, relevant service links, review source | Explore relevant course/service | Launch with confirmed records |
| `/gallery` | Founder portraits and captioned event albums, filters, keyboard-accessible lightbox | Read about Adarshh | Launch |
| `/blog` | Editorial index with Numerology, Numeric Vaastu, Learning, and Practice categories | Read guide | Launch with substantive articles |
| `/blog/[slug]` | Authored articles with useful examples, references, dates, related content | Continue learning / view relevant service | Launch |
| `/contact` | Approved email/phone, location/service area, enquiry, working hours, response expectation | Send enquiry | Launch |
| `/faq` | Concise cross-site questions grouped by consultations, courses, booking, payments | Find relevant offering | Launch |
| `/privacy-policy` | Policy matching the actual data collected, providers, retention, rights, contact | Contact privacy owner | Launch |
| `/terms-and-conditions` | Business identity, service/course terms, access, payment, acceptable use | Contact support | Launch |
| `/refund-policy` | Refund, cancellation, rescheduling and no-show rules with clear deadlines | Request support | Launch |
| `/disclaimer` | Scope and limits of traditional interpretive guidance and educational claims | Understand scope | Launch |
| `/cookie-policy` | Actual cookies/providers and controls, if the final stack uses them | Manage preferences | Conditional |
| `/sitemap` | Human-readable links grouped by category | Navigate | Launch |
| `/sitemap.xml` | Generated canonical, published indexable URLs | Search crawler discovery | Launch |
| `/robots.txt` | Production crawl policy and sitemap URL | Crawler instructions | Launch |
| `/booking/confirmation` | Verified appointment/payment state and next steps; no personal data in URL | View booking instructions | Booking implementation |
| `/booking/manage` | Secure expiring booking link; reschedule/cancel per policy | Manage appointment | Booking implementation |
| `/enquiry/thank-you` | Only after a persisted enquiry; no false appointment confirmation | Next steps | Enquiry implementation |
| `/media` | Linked interviews, podcasts, press coverage; transcript summaries | Watch/read interview | Phase 2 or launch with sources |
| `/alumni/[slug]` | Consented, documented student story with actual context | Explore the studied course | Phase 2 |
| 404 / error states | Helpful navigation and a recovery path | Return to relevant section | Launch |

Transaction/manage/thank-you pages must be `noindex` and absent from the sitemap. Private booking data requires authorization; robots directives are not access control. Optional pages should not be indexed as empty “coming soon” shells.

## 3. Existing catalogue audit

Observed on the [existing homepage](https://numericcvaastu.com/), not independently confirmed as current:

| Course | Listed fee |
|---|---:|
| Numerology Career Launchpad | ₹29,999 |
| Numerology Income Accelerator | ₹74,999 |
| Numerology Legacy Mastery | ₹2.5 lakh |

These replace the provisional course titles in the current prototype. Price records need currency, tax treatment, validity, inclusions, prerequisites, and payment terms before publishing or checkout.

Existing consultation inventory: Personal Numerology Blueprint Session; Career Growth Precision Session; Relationship Compatibility Reading; Business Destiny Mapping Consultation; Baby Name Numerology Consultation; Name Correction Consultation; Mobile Number Energy Reading; Wristwatch Analysis; Signature Analysis Consultation; Residential Vastu Consultation; Office & Business Vastu Consultation.

Retain meaningful service names; simplify labels in navigation. Confirm which are actual consultations versus training offerings. Audit discounted and crossed-out prices separately rather than migrating them automatically. The stated on-site coverage needs a specific origin/address and real service area.

The existing privacy page lists `numericcvaastu@gmail.com`. Treat it as a contact candidate until confirmed. The old site also includes unrelated travel-template content, generic image alt text, and placeholder copy; exclude those from migration.

## 4. Course page template

1. Breadcrumbs, course name, one clear outcome, audience/level, founder image, primary CTA.
2. At-a-glance facts: format, duration, teaching language, cohort date/timezone, prerequisites, fee/taxes. Missing values stay unpublished until supplied.
3. Who it suits and what prior knowledge is needed.
4. Learning outcomes described as skills, not earnings or guaranteed career results.
5. Expandable curriculum modules with lesson topics and practice tasks; never invent a detailed syllabus from a marketing headline.
6. Delivery and support: live versus recorded, mentoring, community, access period, missed-session policy.
7. Instructor section with relevant experience and links to the full biography.
8. Certification: issuer, assessment, completion criteria, and what the certificate represents. No unverified accreditation claims.
9. Genuine experiences from that specific course; no unrelated review reassignment.
10. Fee breakdown and comparison with the next course, payment terms, refunds, FAQs.
11. Final CTA and relevant preparation guide.

A sticky desktop summary and compact mobile CTA should always show the selected course and confirmed price. Course detail pages must be directly linkable and indexable; the existing modal can remain a quick preview only.

## 5. Pricing (no separate page)

Fees are shown where visitors choose: each course page, the Courses learning path, and each consultation card and detail page. A standalone pricing page was built and then retired because it only repeated those figures; `/pricing` redirects to `/courses`.

A single structured offering record must power pricing, cards, details, booking summaries, and structured data. This avoids conflicting fees. Do not invent scarcity, discounts, EMI eligibility, or “most popular” labels. Use custom-quote copy only where the business actually quotes individually.

## 6. Booking flow and operational requirements

The business has not yet selected immediate scheduling/payment versus enquiry-led booking. Do not implement a fake calendar or show success without a real backend result.

**Immediate booking:** service → appointment with visible timezone → minimum necessary contact details → review fee and policies → hosted payment → webhook-verified confirmation → email and secure management link. Collect birth details or floor plans later through a secure intake step when appropriate.

Reserve slots temporarily during payment, expire abandoned holds, prevent double booking, verify payment server-side, and handle duplicate webhooks idempotently. Show payment failure/retry and “payment received, confirmation pending” states accurately. A browser redirect alone is not proof of payment.

**Enquiry-led booking:** service → contact details and preferred availability → persisted enquiry → clear acknowledgement stating that an appointment is not confirmed → team follow-up and agreed payment/schedule.

Needed business inputs: approved prices; session lengths; buffers; weekly availability and leave; timezone; online/on-site formats; meeting platform; payment account/provider; taxes; cancellation/refund/rescheduling terms; contact destinations; notifications. Provider selection remains open until existing accounts and workflow are known.

## 7. Founder imagery, testimonials, and gallery

Nine relevant images are now available locally; [review the image library](image-library.html). Original URLs and classifications are recorded in [the source manifest](existing-site-assets.json).

| Local image | Suggested placement |
|---|---|
| `adarshh-pandey-portrait.webp` | Homepage hero, booking introduction, consultation detail practitioner block |
| `adarshh-pandey-studio-portrait.webp` | About page or gallery; its existing purple background should remain contained within the photograph |
| `adarshh-pandey-with-book.webp` | Founder biography, journal introduction, media/book section |
| `adarshh-pandey-certificate-event-01.webp` through `06.webp` | Gallery, academy community strip, relevant documented milestone |

Use distinct moments rather than repeating one headshot everywhere. Keep subjects intact; use responsive CSS framing, readable captions, cream matting, and the supplied brand logo. Do not recolor the photos or identify an attendee from appearance. Confirm event dates, locations, names, and permissions before writing specific captions.

Gallery filters: All, Portraits, Community & Certificates; introduce Teaching or Media only when actual assets exist. Lightbox needs Escape, arrow controls, focus containment/return, captions, and a close button. No scroll hijacking or autoplay.

The source also contains media logos and decorative icons; these are archived under `docs/source-assets/`, not treated as photographs or evidence of a media appearance. Publish a media logo only with the corresponding interview/article link and accurate context.

Testimonial records should include exact approved wording, display name, relationship (student/client), relevant offering, source URL or original recording, date, permission status, and optional authorized photo. The old “student” section appears to mix consultation experiences; verify categorization. Do not manufacture portraits, star counts, or before/after outcomes. Expand lengthy text accessibly; provide transcripts and captions for videos.

## 8. SEO and GEO implementation

Treat GEO as discoverable, well-supported content for generative search and answer engines. Google says established SEO practices remain relevant and no special AI schema or AI text file is required. Google Search explicitly ignores `llms.txt` for visibility/ranking; it is not a launch priority. [Google AI guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [AI features and websites](https://developers.google.com/search/docs/appearance/ai-features).

**Technical:** server-render substantive page content; unique titles/descriptions; one meaningful H1; self-referencing canonicals; stable readable URLs; contextual internal links and breadcrumbs; social sharing metadata/images; actual modification dates; accurate response codes; structured XML sitemap and HTML sitemap; production robots configuration. Use authenticated/noindex previews. Do not block a URL in robots and expect a crawler to read its noindex instruction.

**Content:** one clear question or intent per page; helpful opening answers, explained examples, transparent scope, named authors, genuine expertise, cited sources, and meaningful updates. Keep founder/organization names, business contact details, and social identity consistent. Separate traditional interpretation from evidence-based claims; avoid guaranteed health, income, relationship, or career outcomes. Never generate near-identical city pages to target locations the business does not serve.

**Structured data:** Organization and WebSite globally; Person/ProfilePage on the real founder profile; BreadcrumbList on detail pages; Course and ItemList for the confirmed catalogue; Article/BlogPosting with real authors and dates; VideoObject only for actual accessible videos with required metadata. Service can describe a consultation semantically without promising a Google rich result. Use LocalBusiness only for an accurate eligible business location/service model. JSON-LD must match visible content.

Google’s Course **list** feature and retired Course **Info** feature are distinct. Validate against current supported guidance; do not promise retired result formats. [Course list documentation](https://developers.google.com/search/docs/appearance/structured-data/course), [feature retirement notice](https://developers.google.com/search/blog/2025/06/simplifying-search-results).

Do not attach self-serving organization rating markup in pursuit of review stars. Testimonials can be valuable visible content without an AggregateRating claim. FAQs remain useful even where rich-result eligibility is restricted. [Review snippet rules](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).

**Images:** self-host retrieved originals, provide responsive optimized sizes, dimensions and thoughtful factual alt text, and prioritize only the main hero. Keep portraits near relevant biography/instructor copy. Avoid replacing useful text with text embedded in images. [Image guidance](https://developers.google.com/search/docs/appearance/google-images).

**Measurement:** establish Search Console and Bing Webmaster Tools ownership; submit sitemap after launch; monitor indexing, branded/non-branded queries, landing-page conversions, broken links, performance, and attributable AI referrals. Separate enquiry submissions, paid bookings, and course leads; do not send birth dates, messages, email addresses, or payment data to analytics. Neither rankings nor AI citations are guaranteed.

## 9. Initial journal plan

Publish a small set of genuinely reviewed articles, each with an accurate author byline. Adarshh must actually review content before it is labelled reviewed by him.

| Proposed article | Reader purpose | Relevant destination |
|---|---|---|
| What is numerology? A beginner’s introduction and its limits | Understand the subject | Courses |
| Understanding the Lo Shu grid, with a worked example | Learn a concept | Launchpad |
| Numerology and Numeric Vaastu: how the approaches differ | Choose learning/service path | Consultations |
| What to prepare for a numerology consultation | Prepare for a session | Booking |
| How to compare numerology courses and certificates | Evaluate learning options | Course comparison / pricing |
| Building a responsible consultation practice | Explore professional learning | Accelerator |

Use original explanations and examples. Provide relevant source references and editorial review, not mass-produced keyword articles. Category pages need useful introductions and enough published articles before indexing.

## 10. Legal and content readiness

Create real policy pages rather than generic modal notices. Their contents must reflect the final business and technology setup: legal entity/contact, collected data, purposes, providers, retention and deletion, consent choices, security approach, minors if applicable, cookie inventory, payment terms, course access, certificate conditions, cancellation/refund handling, travel costs, and dispute/support process. Draft only from confirmed operations and have the business obtain appropriate legal review before publication.

The existing privacy policy was retrievable. Terms, refund, contact, robots and sitemap requests failed during this audit; this is not proof those pages are absent. Retry and compare them before migration. Do not silently carry forward a generic policy that contradicts the new booking or analytics system.

## 11. Migration and implementation order

1. **Content foundation:** approve catalogue, prices, founder spelling, business details; record source provenance and assets. Choose booking model and editorial workflow.
2. **Shared architecture:** reusable header/footer/breadcrumbs, structured courses/services/testimonials/gallery/articles; extract the current single-file homepage into server-rendered sections and small interactive components. Begin with repository-managed content; add a CMS if nontechnical staff need frequent publishing and approvals.
3. **Commercial pages:** courses index + three course details, pricing, consultations and substantive service pages. Connect every CTA to an actual route.
4. **Trust and content:** about, testimonials, gallery, contact, FAQs, journal, policy pages; replace homepage abstract imagery with the selected founder portraits while retaining decorative geometry selectively.
5. **Booking integration:** provider/backend, validation, availability, payments if selected, notifications, failure states and management flow.
6. **Search/migration:** metadata, schema, sitemap/robots, redirects, legacy anchors, performance, and search ownership verification.
7. **QA and release:** cross-device/keyboard checks, content/price parity, image load checks, privacy review, schema testing, crawl audit, booking end-to-end tests, then staged deployment and monitoring.

Preserve `/privacy-policy`, `/refund-policy`, and `/contact`. Map old `/terms-and-condition` to `/terms-and-conditions` with a permanent redirect. Retain old homepage section IDs as alias anchors where practical: fragments do not reach the server, so ordinary server redirects cannot map `/#section` to a new route. Select one canonical host and redirect the alternate after verifying domain/CDN configuration. Do not change the preferred host based solely on a tool fetch failure. [Migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## 12. Acceptance criteria and outstanding decisions

- All published pages have original useful content, working primary actions, unique metadata, and accurate images.
- Every offering has one shared data record; price, taxes, inclusions and policy links agree across routes.
- Direct detail URLs render meaningful HTML; no content depends solely on opening a modal.
- Keyboard navigation, visible focus, accessible dialogs/lightbox, form errors, reduced motion, and 375–1440px layouts verified.
- Main content/image loads do not shift the layout; check field Core Web Vitals after real traffic exists.
- Sitemap contains only canonical published pages; no checkout/private/thank-you URLs or empty content.
- Schema validates and contains only supported, visible facts; no invented accreditation, testimonials, dates, fees, or media endorsements.
- Booking success requires persisted booking and verified payment where applicable; failures preserve user input without double-charging or double-booking.
- Staging remains unindexed; production crawl settings and redirects are checked at launch.

Awaiting owner decisions: booking model; current catalogue/fees; taxes; founder spelling confirmation; course syllabus/schedule/access/certification; booking availability and providers; approved business contacts; image captions and attendee permissions; review sources; policy rules; CMS needs. These do not block page structure, templates, or image preparation, but they do block accurate final commercial copy and live transactions.

## Implementation snapshot — 1 October 2026

The route and content work now lives in the Next.js App Router. Working routes include About, Courses and three detail pages, Consultations and eleven detail pages, Pricing, booking enquiry, Testimonials, Gallery, Blog and four articles, Contact, FAQ, five policy/information pages, a human sitemap, an XML sitemap and robots.txt. The root homepage links into these routes. The Aceternity-inspired loader adaptation is available at `/loader-preview` for review and is kept out of the sitemap.

All prices and offer descriptions are read from [`src/data/offers.ts`](../src/data/offers.ts). The amount in paise is shared by listing cards, detail pages, pricing, booking selection, and the future server checkout resolver. See [`docs/OFFERS.md`](OFFERS.md) for the editing workflow and Razorpay integration contract. Prices remain marked unverified and checkout disabled. Course and consultation page HTML revalidates every 60 seconds, so scheduled promotion display can update after deployment.

The current booking route prepares an enquiry and does not reserve a slot or charge the visitor. Razorpay order creation, payment verification, booking storage and calendars cannot be completed until the business supplies provider accounts, policies and availability rules. Testimonials are editorial summaries of old-site feedback and are `noindex` pending approval; policy drafts are also `noindex`. Media and alumni detail pages were not published because linked coverage and consented stories have not been supplied. Booking confirmation and management routes will be implemented with the real booking backend to avoid false confirmation.

`npm run build` and `npm run test:catalogue` pass. Browser tests are written in `tests/site.spec.js`; this environment could not start local browser/server processes for a full run because of sandbox port and Chromium restrictions. Re-run `npm test` in a browser-capable environment before release.

## Conversion-focused homepage update — 1 October 2026

The homepage now leads with the foundation learning outcome, a direct course-detail CTA, a course comparison CTA, a visible consultation alternative, founder imagery, and concrete course inclusions. A three-course comparison follows immediately, with audience, learning outcome, catalogue-derived listed fees, and direct detail links. An announcement appears across the site and displays a discount label only when a promotion in `src/data/offers.ts` is active. `featuredOfferId` in the same file controls which course the hero and announcement promote. No fabricated countdown or scarcity is shown; current listed fees remain unverified and checkout remains disabled.

Motion is a brief, reduced-motion-aware hero entrance using a spring function adapted from [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics). That repository's full workflow makes video B-roll from footage and a transcript, so only its deterministic spring approach is appropriate for this web page. See `docs/THIRD-PARTY-MOTION.md` for attribution. The design follows the user-testing emphasis on clear product-finding paths and meaningful bespoke imagery in [Baymard's homepage research](https://baymard.com/research/homepage-and-category-usability) and keeps animation to transforms and opacity in line with [web.dev performance guidance](https://web.dev/articles/animations-and-performance).

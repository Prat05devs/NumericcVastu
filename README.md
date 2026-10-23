# NumericcVaastu

A responsive Next.js site for Adarshh Panndey’s consultation and education brand. The homepage, multipage routes, founder image library, journal, structured metadata, XML sitemap, robots policy, and booking enquiry are in the project.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000 (or the port reported by Next.js). Use `npm run build` for a production check and `npm test` for browser tests.

## Edit offers and prices

**[`src/data/offers.ts`](src/data/offers.ts) is the only commercial catalogue.** Courses, consultations, pricing cards, homepage previews, enquiry selection, and future checkout price resolution depend on it. See [the offer editing and Razorpay guide](docs/OFFERS.md). Source prices are awaiting confirmation, and payment is disabled.

## Contact and hosting configuration

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_SITE_URL` is the canonical production origin. `NEXT_PUBLIC_CONTACT_EMAIL` activates a prepared email enquiry; when absent, the booking form downloads a draft locally and makes no submission. `NEXT_PUBLIC_BOOKING_URL` is retained from the earlier prototype but the new booking page owns the current journey.

The image assets downloaded from the former site are in `public/images/adarshh/`; their provenance is in `docs/existing-site-assets.json`. Confirm captions and permissions for people at certificate events before adding names. Use the owner-confirmed name “Adarshh Panndey” everywhere in website copy. Existing image filenames retain their original `adarshh-pandey-` slug.

## Loader preview

Visit `/loader-preview` to review a NumericcVaastu adaptation of Aceternity’s Multi Step Loader. The preview simulates booking, enrolment and report preparation. In production, pass a **controlled** `value` and `status` from the actual process. The underlying request must decide when the loader completes. The component lives in `src/components/ui/multi-step-loader.tsx` and supports `loadingStates`, `loading`, `duration`, `loop`, `value`, `status` and `onClose`.

The provided shadcn installer could not complete because automatic approval review reported a usage limit. The supplied component source was integrated manually in the requested `components/ui` structure and adapted to the brand. TypeScript and Tailwind v4 support were added without resetting the existing CSS.

## Content and launch

The site plan is in [docs/WEBSITE-PLAN.md](docs/WEBSITE-PLAN.md). Course prices, schedule, syllabus, certification, testimonial attribution, business contacts, and commercial policies need owner review. Legal pages are marked `noindex` until approved. Booking is an enquiry draft, not a confirmed appointment. No Razorpay integration is active. Publish after reviewing all content and replacing draft policy text with approved terms.

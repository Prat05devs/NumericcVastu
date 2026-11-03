# Search, local and AI visibility (SEO and GEO)

Researched and implemented 2 November 2026; domains, shop and name spellings revised the same day. This explains which searches each page targets, where the keywords live in the code, and the work outside the website that decides most local and AI rankings.

## How people find Adarshh, and what decides each result

| Where the search happens | What decides who appears | What this site does |
|---|---|---|
| Google map pack and "near me" searches | The Google Business Profile: category, distance, review count and rating, activity, and matching name, address and phone everywhere | Links the profile from the header, footer, contact, reviews, location pages, consultation pages and checkout success; asks for reviews; uses the same name, address and phone in structured data |
| Google organic results ("best numerologist in Delhi") | Relevant page with the phrase in its title, heading and copy; links; reviews; site trust | One page per real search intent, keyword titles and descriptions, linked schema, sitemap |
| Google AI Overviews and Gemini | Google's index plus the Business Profile | Same as above. Clear question-and-answer copy |
| ChatGPT search and Microsoft Copilot | **Bing's** index | Allows OpenAI and Bing crawlers. **Submit the sitemap to Bing Webmaster Tools** |
| Claude, Perplexity, DeepSeek, Kimi and other assistants | Their own crawlers, Bing and Brave results, and open datasets such as Common Crawl | Allows their crawlers; publishes `/llms.txt`; states plain facts that can be quoted |

Neither rankings nor AI mentions can be guaranteed. Reviews and real citations on other websites move results more than anything on the page.

## Three domains, one listing

`www.numericcvaastu.com`, `www.numericcvaastu.in` and `www.numericcvaastu.org` each open the full site and stay on their own address. A visitor who types `.in` sees `.in` throughout. Links inside the site are relative, so they never jump to another domain.

Search engines treat three copies of one site as duplicates and split rankings between them. To avoid that, every page on every domain carries a canonical link to the same page on `.com`. The sitemap, structured data and `llms.txt` also use `.com`. Google then lists `.com` in results and credits it with every link and review, while each domain keeps working for anyone who types it. The business's structured data lists all three domains as its own (`sameAs`). The bare `numericcvaastu.com` redirects to `www` on Vercel; `/shop` forwards to the crystal store.

In Vercel, set `NEXT_PUBLIC_SITE_URL=https://www.numericcvaastu.com`. The code also treats the old bare value as `www` (`src/lib/site.js`). In Search Console, verify all three domains. Pages on `.in` and `.org` will show as "Alternate page with proper canonical tag"; that is expected. To list a different domain in results instead, change `CANONICAL` in `src/lib/site.js`.

## Name and brand spellings

Visible copy always says **Adarshh Panndey** and **NumericcVaastu**. People also type the misspellings below, so they appear in structured data (`alternateName`), meta keywords, `llms.txt` and the About page's spelling line. That connects those searches to the right person without misspelling the visible copy.

- Person: Adarsh Pandey, Aadarsh Pandey, Adarshh Pandey, Adarsh Panndey, Aadarshh Panndey, Aadarshh Pandey, Adarsh Pande, Adarsh Panday, Numerologist Adarsh Pandey, Numerology by Aadarshh, आदर्श पांडेय, आदर्श पांडे
- Brand: Numericc Vaastu, NumericVaastu, Numeric Vaastu, Numeric Vastu, NumericcVastu, Numericc Vastu

A search for "Adarsh Pandey numerologist" found nothing about him in November 2026, which is the gap this closes. The most common misspelling, "Adarsh Pandey", is also used:

- as visible text: the question "Is Adarsh Pandey the same numerologist as Adarshh Panndey?" on the homepage and FAQ (and so in the site guide and `llms.txt`), and the spelling line in About quick facts;
- in the About page title and description, and the homepage description;
- in the keywords of the homepage, About, contact and Delhi pages;
- in structured data, as `alternateName` and a `disambiguatingDescription`, because many people share the name Adarsh Pandey;
- as hidden words in the header page search, so typing "Adarsh Pandey" finds the About page.

Off the site, the strongest signals are other profiles that state both names. Keep the YouTube handle `@Numerologistadarshpandey`, which already contains the common spelling. Set the channel's display name to "Numerologist Adarshh Panndey" and add "also searched as Adarsh Pandey" to the channel, Instagram and podcast descriptions. On Wikidata, add Adarsh Pandey, Aadarsh Pandey and आदर्श पांडेय as **aliases** of his item; Google's Knowledge Graph and many AI models read those aliases.

## Keyword map

Each page's title, description and keywords are in `src/data/seo.js` (static pages and every offer) and `src/data/locations.js` (local pages).

| Cluster | Main searches | Page |
|---|---|---|
| Brand | Adarshh Panndey, Adarsh Pandey numerologist, NumericcVaastu, Numeric Vastu, numerologist Adarshh | `/`, `/about` |
| Delhi | best numerologist in Delhi, numerologist in Delhi, famous / top numerologist in Delhi, numerologist near me, numerology consultation in Delhi, ank jyotishi Delhi | `/numerologist-in-delhi` |
| Rohini | numerologist in Rohini, near Rohini, Pitampura, Shalimar Bagh, North-West Delhi, vastu consultant in Rohini | `/numerologist-in-rohini` |
| NCR | best numerologist in NCR, numerologist in Delhi NCR, Ghaziabad, Faridabad | `/numerologist-in-delhi-ncr` |
| Noida | numerologist in Noida, best numerologist in Noida, Greater Noida, Noida Extension, vastu consultant in Noida | `/numerologist-in-noida` |
| Gurugram | numerologist in Gurgaon / Gurugram, career numerology Gurgaon, office vastu Gurugram | `/numerologist-in-gurgaon` |
| North India | best numerologist in North India, best / famous numerologist in India, numerologist in Lucknow / Chandigarh / Jaipur / Dehradun, Hindi numerologist online | `/numerologist-in-north-india` |
| Online and abroad | online numerology consultation, talk to numerologist online, Indian numerologist in USA / UK, numerologist in Dubai, numerology consultation for NRI | `/online-numerology-consultation` |
| Vastu | vastu consultant in Delhi, best vastu consultant in Delhi, vastu expert near me, home / office vastu Delhi, numeric vastu | `/vastu-consultant-in-delhi`, Vastu consultations |
| Personal reading | personal numerology reading, numerology reading by date of birth, Mulank Bhagyank reading | `/consultations/personal-numerology-blueprint` |
| Career | career numerology, career by date of birth, job or business numerology | `/consultations/career-growth-precision` |
| Relationships | marriage / love compatibility by date of birth, relationship compatibility numerology | `/consultations/relationship-compatibility` |
| Names | name correction numerology, lucky name spelling, numerology name change, Chaldean name numerology | `/consultations/name-correction` |
| Baby names | baby name numerology, baby name by date of birth, lucky baby name | `/consultations/baby-name-numerology` |
| Mobile numbers | mobile number numerology, lucky mobile number by date of birth, phone number numerology | `/consultations/mobile-number-energy`, calculator |
| Business | business / company / brand name numerology, lucky business name | `/consultations/business-destiny-mapping` |
| Signature and watch | signature analysis, lucky signature, wristwatch numerology, which hand to wear watch | Signature and wristwatch consultations |
| Free tools | Lo Shu grid calculator, numerology calculator by date of birth, Mulank / Bhagyank / Kua calculator, missing numbers, Vedic numerology calculator, numerology kundli | `/numerology-calculator`, `/vedic-numerology-calculator` |
| Learning | numerology course, online, in Hindi, in Delhi, certification India, become a numerologist, advanced / Vedic / mobile numerology course, mentorship | `/courses` and the three course pages |
| Products | buy rudraksha online, original rudraksha, crystal bracelet, healing crystals, gemstones, yantra, shree yantra, vastu products, numerology wristwatch | numericcvaastucrystal.in (the Shop menu opens it directly); the wristwatch consultation |
| Media | numerology predictions 2026 / 2027, Mulank predictions, numerology podcast Hindi, award-winning numerologist | `/predictions`, `/podcasts`, `/achievements` |

Competitors that rank for "best numerologist in Delhi" (Dinesh Atrish, Archana Goyal, Anu Nagpal, Abhinandan Kumar, Rupesh Kumar Jha and others) each have a dedicated city page. The location pages give Adarshh the same footing, backed by facts competitors cannot copy: 20,000+ consultations, his book, his awards, podcasts and predictions on record.

## Where the keywords go

- **Titles and descriptions:** `src/data/seo.js` `pageSeo` and `offerSeo`, and `seo` in each entry of `src/data/locations.js`. `metadataFor()` adds canonical, Open Graph and Twitter tags.
- **Headings and copy:** the location pages, the homepage hero ("Numerologist & Vastu consultant · Rohini, Delhi"), the homepage's in-person and online section, About quick facts, and FAQs.
- **Questions people ask:** service-specific FAQs in `offerSeo`, local FAQs in `locations.js`, and answers on `/faq`, each published as `FAQPage` schema.
- **Structured data:** `src/lib/schema.js` publishes one linked graph on every page: `ProfessionalService` (address, map, service area, price range, offer catalogue), `Person` (alternate names, awards, `sameAs` profiles), `Book` (ISBN 9789348518491), `WebSite` and `OnlineStore`. Pages refer to these by `@id`. There is no self-written star rating, because Google ignores self-serving review markup.
- **AI assistants:** `/llms.txt` is generated from the same data, so prices, links and facts always match the pages. `robots.txt` names the AI crawlers explicitly and points to the sitemap.
- **Internal links:** the footer "Near you" column, homepage locations grid, contact page, site map, header page search and site guide all link the location pages. The Shop menu, footer and homepage open numericcvaastucrystal.in directly.

## Off-site actions, in order of impact

1. **Google Business Profile.** Confirm the name, address and phone match the website exactly. Choose the closest primary category (Numerologist if Google offers it, otherwise the nearest available) and add Vastu-related secondary categories where available. List every consultation as a service with its price, add the website link `https://www.numericcvaastu.com`, upload real photos, post weekly, and answer Q&A.
2. **Reviews.** Paste the profile's "Ask for reviews" link into `googleBusiness.reviewUrl` in `src/data/contact.js`, so every "Write a Google review" button opens the review form directly. Send the link on WhatsApp after each session, and reply to every review. Once the profile shows a rating, add `rating` and `reviewCount` in the same file to display them.
3. **Bing Webmaster Tools and Bing Places.** ChatGPT and Copilot search through Bing. Import the site from Search Console, submit `sitemap.xml`, and claim Bing Places with the same details. Add `NEXT_PUBLIC_BING_SITE_VERIFICATION` if verifying by meta tag.
4. **Google Search Console.** Verify (DNS, or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`), submit `https://www.numericcvaastu.com/sitemap.xml`, and request indexing for the eight location pages.
5. **Matching listings.** Use the same name, address and phone on Justdial, Sulekha, IndiaMART, Apple Business Connect, LinkedIn (company and personal), Amazon Author Central, and the crystal store's footer and contact page.
6. **Profiles linking back.** Put `www.numericcvaastu.com` in the Instagram and YouTube bios and in podcast and video descriptions, with the full name spelt "Adarshh Panndey".
7. **Wikidata.** Create items for Adarshh Panndey (numerologist, Delhi, official website, Instagram, YouTube) and his book (ISBN). Many AI systems use Wikidata to identify people.
8. **Mentions.** Interviews, podcast show notes and "top numerologists in Delhi" features that name him and link the site are what AI assistants cite. Paid press releases with no editorial value do little.

## Measure

- Search Console: impressions and clicks for the queries above, by page; indexing of the location pages.
- Business Profile insights: calls, direction requests, website clicks, review count.
- Every month, ask ChatGPT, Gemini, Claude and Perplexity "best numerologist in Delhi", "numerologist in Rohini", "who is Adarshh Panndey" and "online Indian numerologist for NRIs", and note whether he is named and linked.

## Maintaining

- Change a price only in `src/data/offers.ts`. Pages, structured data and `llms.txt` all follow it.
- Add a city only when there is something true and specific to say about it (see the rules at the top of `src/data/locations.js`), and add its Hindi to `src/i18n/hi.json`. Near-identical city pages are treated as doorway spam.
- Update `UPDATED` in `src/app/sitemap.js` when page content changes substantially.
- Instagram counts update themselves every five days once the API token is set (see [INSTAGRAM.md](INSTAGRAM.md)). Keep the other stats in `src/data/media.js` and podcast views in `src/data/podcasts.js` current by hand.

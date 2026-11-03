# Numerology report and calculation references

The calculator accepts a name in English transliteration, a national phone number, a birth date, and optional male/female Kua selection. These inputs stay in browser memory. The calculator URL contains only birth date and Kua choice; names and phone numbers are never placed in URLs or storage by this feature.

## Sources found

These local reference documents were inspected, not copied into the public repository:

- `~/Downloads/Numerology Report Template.pdf`: the report structure, reflection prompts and action plan.
- `~/Downloads/Viekram Biyaani ji Report .pdf`: the completed report headed **Viekram Biyyani, 17-09-1977**. The spelling in the report matters for reproducing its name calculation.
- `~/Downloads/friends and Enemy nunber by Rohit sir.pdf`: Dr. Rohit Gadkari's Lecture 5, 29 July 2022. It supplies all nine compatibility lists, the worked Mulank 6 / Bhagyank 1 example, and the colour table.
- `~/Downloads/Drx . Adarshh Panndey.pdf`: a profile document, not a calculation specification.

No separate comprehensive calculation manual was found. The supplied local sources do not specify a full phone digit-pair/zero scoring algorithm or a separate Vedic construction formula. Published online references now supply the provisional Vedic convention and the four-purpose Kua direction table (see below). Do not label those calculations practitioner-verified until that specification is supplied.

## Implemented rules

- Mulank: reduce the birth day. Bhagyank: reduce all birth-date digits.
- Lo Shu positions: **4-9-2 / 3-5-7 / 8-1-6**. Include all non-zero date digits, Bhagyank, and Mulank for two-digit days except 10, 20 and 30. Optional Kua is added only to Lo Shu.
- Vedic numerology kundli positions: **3-1-9 / 6-7-5 / 2-8-4**, using non-zero DD-MM-YY digits (century excluded), Bhagyank from the full date and eligible Mulank, excluding Kua. This follows the separately published Vedic construction, not an astronomical birth chart. Name and phone digits do not enter either kundli.
- Kua: the existing site's last-two-year-digits rule, with different constants before/after 2000; 5 maps to male 2 / female 8.
- Name: the Chaldean table printed in the completed report. Ignore spaces, punctuation and hyphens; retain compound totals and reduced numbers. Reject unsupported scripts instead of silently discarding letters.
- Phone: display the national digits, their sum and reduced total; compare that total separately with Mulank, Bhagyank and the name number using the reference compatibility table. No country code is counted. This is a limited total/compatibility evaluation; it does not score adjacent pairs or declare a number universally lucky.
- Combined compatibility: an enemy of either core number stays an enemy; otherwise short-term applies before friend, then neutral. For 4/8, preserve the source's short-term warning.
- Colours: map friendly/enemy lists to the reference sheet's colours. Keep the sheet's warning to minimise black. This can produce both a dark friendly colour and an avoid-black warning, as in the source itself.
- Personal year: reduce birth day + month + calendar year. Show six years from the report year.
- Life periods: first period is Mulank years; advance through 1–9, each period lasting its own number of years. Birthday boundaries determine the current period.

## Differences requiring practitioner review

For Biyyani, the report lists friendly **3,5,6**, neutral **7,9**, avoid **4,8,1,2**, with colours including indigo/orange. The Lecture 5 combination rule instead gives friendly **3,5,6,7**, neutral **9**, enemy **1,2**, and short-term **4,8**. Indigo and orange are not in that sheet's colour table. The site consistently uses the explicit reference sheet rather than reverse-engineering a rule from this one example. Both rules cannot be reproduced by one unqualified algorithm.

The sample's name totals (first **21/3**, full **33/6**), Mulank **8**, Bhagyank **5**, and Lo Shu without Kua are regression fixtures in `tests/numerology.mjs`.

Only missing-number 2/3/4/6 placements are sourced from the sample. Other introductory remedies retain the existing site's practitioner-review status. Report narratives for career, relationships, growth and action planning are reflective summaries, not a reproduction of all third-party software chapters. No disease, guaranteed financial return, zodiac reading or unverified compound-number prediction is generated.

## Report export and later payments

The report is free for testing. Generate it from the calculator, then choose the explicit Hindi or English download button for a self-contained HTML copy in that language. Export language is independent of the navigation toggle and does not regenerate the calculation. HTML includes localized dates, an embedded logo and its own print styles. Open the download and use print/save PDF for a PDF in the downloaded language; the on-page print button uses the displayed language. Reports and phone numbers are not saved to a server.

The detailed edition contains nineteen chapters plus a cover. Number profiles have four explained traits each; work, money, wellbeing and action plans combine the birth, destiny and name profiles. All six personal years have ten planning points. Every listed life period includes work, relationship, priority, caution and practical guidance. These are authored reflective interpretations of the existing number themes, not newly verified predictions.

The contextual edition introduces each number once. Strengths, work, money and wellbeing chapters apply those themes to distinct situations instead of reproducing the opening personality descriptions. A matching Mulank/Bhagyank has one shared core practice. The insight and action-plan chapters link back to the explanations rather than printing the same instructions again.

The personal-reflection chapter contains populated chart-based starting points and examples, not blank writing lines. It selects a practical focus from the remedy plan, uses the supplied relationship context for a decision-review prompt, and links to the selected starting practices. It does not claim to know an unreported postponed decision. The same content is included in both language exports; an already downloaded static file must be regenerated to receive changes.

The love chapter separates attraction, longer-term potential, expression through the name, missing positions, the current personal year and the active life period. It gives a conditional five-year outlook after the current year. An optional relationship-context selector chooses single, developing or committed guidance; the default displays both paths and makes no assumption about actual relationship status. An optional second birth date adds birth/destiny comparisons and shared friendly numbers. These inputs stay in browser memory and the generated document; they are not put in URLs or saved to storage. No invented partner details, infidelity claim, marriage date or breakup prediction is generated.

The sample's life-path-5 relationship text emphasises novelty, freedom and eventual commitment, while its birth-number-8 text discusses sacrifice and expectations. These supply different relationship contexts; the 8 narrative is not copied onto every person's reading. Its relationship-specific ratings also differ from the supplied friend/enemy chart and include master numbers without a complete calculation specification. The site continues to identify compatibility using the supplied explicit chart rather than silently combining conflicting rating systems.

`reportGuidance.js` records a canonical ID, triggers and source scope for each traditional practice. The mala and plant suggestions shared by missing 3/4 are listed once. Cow care for core 5 and missing 6 is also listed once, with both intentions. Missing positions in Lo Shu and Vedic are disclosed separately; a matching name number does not fill a grid gap. Present support is explained as a route to practising a habit, not an invented planetary-strength score. Wear/placement suggestions involving an enemy or short-term core relationship receive a review-first note.

Each remedy card explains its intention, how to follow it, timing actually given by the source, and links to its behavioural practice. A separate practical routine suggests what to review after 30 days. No bead count, metal weight, mandatory donation amount, chant count or activation sequence is invented. The sample supplies missing 2/3/4/6 practices and a birth-number-8 remedy chapter; other traditional suggestions remain visibly marked for practitioner review. A three-practice starting plan prevents the full list from becoming an instruction to perform every ritual or buy every item.

Before charging for reports, add durable verified payment entitlements and a protected delivery flow. The existing consultation checkout alone is not a report entitlement system. Confirm the remaining calculation methods, content and commercial policies before calling this a practitioner-approved paid report.

## Online cross-check and provisional methods

The public references below were checked on 1 November 2026. Matching a tradition's published arithmetic is not scientific validation of its predictions. The client's private name and phone number were calculated locally, not searched online or committed as fixtures.

- [FengShuied: Kua calculation and the full Eight Mansions table](https://www.fengshuied.com/kua-number) supplies four favourable purposes for every Kua: Sheng Chi, Tien Yi, Yan Nian and Fu Wei.
- [Feng Shui Store: Gua year and direction chart](https://www.fengshuiweb.co.uk/wp-content/uploads/2012/04/eightmansions-1.pdf) and [Mark Sakautzky: Kua / Lo Shu numbers](https://www.feng-shui-ms.com/files/MMS-The-Kua-Lo-Shu-Numbers.pdf) independently list male 2002 as Kua 7 after the solar-year boundary.
- Kua 7 references **West for growth, South-west for wellbeing, North-west for work/success, and North-east for relationships**. The old single “best direction” output hid three of these choices. Both the free reading and report now render the same four-purpose table. This does not establish Adarshh's unconfirmed rule based on missing grid positions.
- The existing Kua calculation uses calendar birth year. Sources that change year at Li Chun can give a different result for January / early-February births. The UI explicitly discloses that boundary limitation rather than guessing a solar transition.
- [Aditya Vastu's own Vedic calculator](https://www.adityavastu.co.in/tools/vedic-numerology-calculator) specifies DD-MM-YY plus driver/conductor in the 3-1-9 layout and lists all eight structural planes. [AstroLeaf's construction rules](https://astroleaf.in/vedic-grid-calculator/) corroborate century exclusion, use of the full year for Bhagyank, and the compound-day exception. The Vedic grid now has its own source digits and plane readings. This is provisional until Adarshh confirms his preferred Vedic school.
- [Suba Bantham's published Chaldean table](https://subabantham.com/numerology/how-it-works) agrees with the provided sample's letter table: values 1–8, with 9 possible as a reduced total.
- [J C Chaudhry's mobile-number lecture](https://www.youtube.com/watch?v=OVi6bDhCioY) discusses phone-total compatibility against name, psychic and destiny numbers. The site now shows all three comparisons using the client's supplied compatibility chart. It does not invent adjacent-pair scores or automatic name/phone changes.

Full practitioner review remains necessary for a different Vedic method, missing-number direction recommendations, detailed compound-number meanings, and any paid report release. The two separate free tools share one combined report product; report generation remains free for testing as requested.

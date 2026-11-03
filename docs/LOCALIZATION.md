# English and Hindi

`src/i18n/hi.json` contains authored Hindi messages keyed by the existing English copy. `translate.js` resolves exact messages, case variants and explicit interpolation templates. Unknown copy stays readable in English. No external translation request is made.

`LocaleProvider` holds the current language. The navigation toggle switches it without reloading, preserving forms and calculator results. The choice persists in `localStorage` under `nv-locale`; browsers that block storage still support switching for the current visit. English is the static server-rendered snapshot, with the saved preference restored after hydration. URLs and SEO metadata retain their English defaults.

`LocaleScope` provides a language for a local render tree without modifying the page language or storage. Report downloads use this boundary in a detached React root, so the explicit Hindi and English buttons export the selected language regardless of the navigation toggle. Each export uses the existing report data, localized dates, embedded logo and shared styles. The detached root is unmounted after its HTML is read. Downloads are self-contained HTML; open one and use the browser's print/save PDF option for a PDF in that language.

`LocalizedContent` is a transparent React render boundary used by page and component render functions. It translates text and display/accessibility attributes without DOM mutation or translating routes, IDs, form values or data objects. Each independently rendered component owns its boundary. Do not wrap a data object containing a JSX field. An option without an explicit value gets its original English value before its label is translated, so checkout enums remain stable.

Use `translate="no"` around user-provided strings, exact quotations, letter arithmetic and proper titles that should remain unchanged. Native review quotations and author names remain in their original language. Third-party payment/video widgets are controlled by their providers.

When adding copy, add its Hindi message in the same change. For dynamic sentences use a reviewed explicit template such as `Personal year {year}`; do not build translation by arbitrary word substitution. Test both languages, mobile layouts, visible labels, error messages and form submission values. The site guide accepts common Hindi topic words as well as English/Hinglish.

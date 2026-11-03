# Website navigation

The header groups existing pages into Consultations, Free tools & reports, Courses, Watch & read, About, and Help & contact. `src/data/navigation.js` owns the groups and page-search index. Consultation and course links resolve from the offer catalogue; add new destinations to this data rather than duplicating link lists in the component.

`src/components/SiteHeader.jsx` renders desktop mega-menus and mobile accordions from the same data. Click or tap toggles a section; mouse hover opens desktop sections after a short delay. Buttons expose `aria-expanded`/`aria-controls`. Arrow Down enters a desktop panel, Left/Right moves between section buttons, Escape closes and restores focus, and leaving the navigation or clicking outside dismisses it.

Search uses a native modal dialog with an input and category selector. It matches both the original English and authored Hindi labels. No query is sent to a service or saved. Links retain their original routes when the display language changes.

`src/navigation.css` owns the header layout. At 1100px and below, categories become expandable sections with scrollable contents, a booking action and contact number. Header height is measured for panel bounds and anchor offsets. New copy must also be added to `src/i18n/hi.json`.

`tests/navigation.spec.js` checks navigation and dismissals, keyboard use, search, Hindi, mobile, four viewport widths and every internal menu destination.

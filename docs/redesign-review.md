# WashPilot design review

Status: implementation prepared; visual and live authenticated acceptance checks pending.
Baseline: `51cdaf3b37304104b27a17ed04b1cb9572cd952c`.

## Design

The existing navy #10233f and blue #2563eb anchor one shared stylesheet. White cards on a cool neutral canvas, 10px control radii, 14–18px card radii, restrained shadows, larger text, 44px minimum compact actions, visible focus and reduced-motion preferences apply across existing screens. Existing logo files are unchanged. Facility photos use contain rather than crop.

The stylesheet is loaded after existing page styles; page classes distinguish marketing, authentication, application and standalone workspace layouts. Existing application logic and dynamic rendering stay intact. `washpilot-accessibility.js` adds associated labels, active navigation semantics, keyboard-scrollable table regions, polite toast announcements and dialog/mobile-drawer focus handling. It does not access storage, authentication, databases or the network.

## Inventory and coverage

| Surface | Existing entries covered |
| --- | --- |
| Standalone public | home.html, 404.html |
| Authentication | signin.html, signup.html, forgot.html; legacy login, registration and recovery panels in index.html |
| Standalone workspace | dashboard.html, pos.html |
| Marketing routes in index.html | /features, /business, /how-it-works, /pricing, /about, /faq, /contact |
| Public booking | /businesses, /booking, /book/{slug}; facility profile/gallery/services; service selection, add-ons, availability calendar, customer details, review, payment instructions and confirmation |
| Day-to-day workspace | /dashboard, /new-wash, /service-queue, /transactions, /customers, /bookings, /facility-listing |
| Management | /services-pricing, /add-on-analytics, /employees, /expenses, /reports, /inventory, /branches, /loyalty-packages, /service-recipes, /shift-reconciliation, /subscription-billing, /business-management |
| Platform administration | /platform/overview, /platform/businesses, /platform/billing-revenue |
| Overlays and account states | receipt/payment/service/employee/expense/stock/branch/package/shift dialogs, registration, recovery, guided tours, trial and account hold screens |

All eight original HTML files are identical to baseline once the shared asset references and body styling class are removed. Existing logos, images, copy, prices, form behaviour, URLs, redirects, Supabase integration, payment calculations, booking holds, trial rules and permissions are retained.

## Validation completed

- Existing booking payment tests: passed (verified/pending separation, deduplication, Manila payment date, historical payments, tenant and tour isolation, stale requests and failure reporting).
- Existing facility address tests: passed (scope, unavailable Google configuration and draft state).
- All eight HTML documents: exact preservation comparison passed; all inline JavaScript parsed.
- Shared CSS: parsed with PostCSS.
- Accessibility DOM tests: passed for generated labels, active navigation, table focus, toast role, dialog naming, Tab/Shift+Tab containment, Escape dismissal and focus restoration.
- `git diff --check`: passed.

Run existing tests with `node --test tests/*.test.cjs`.
Run additional checks with jsdom and postcss installed in an isolated directory and `NODE_PATH=/path/to/node_modules node tests/design-validation.cjs`. These are development-only dependencies; the site has no new build or runtime package dependencies.

## Acceptance checks still required before merge

Both available browsers could not connect to the local HTTP preview. Automatic approval review rejected a temporary public tunnel because it could expose application content. No production deployment, merge, database write or real payment was performed.

Use an approved preview environment and verify at 360px, 390px, 768px and 1440px:

- Every entry and route above: text/contrast, no page-wide horizontal scrolling, navigation and all visible controls.
- Desktop/tablet sidebar and mobile drawer, bottom navigation, Escape and keyboard focus.
- Auth success/error/loading/recovery using a test account.
- Every owner/platform tab under the appropriate roles, trial, hold and premium states.
- Booking date/service/add-on selection, available/unavailable slots, review, hold expiry and payment confirmation using an authorised test payment workflow.
- Dialogs with validation errors, long content, keyboard navigation and return focus.
- Guided practice, scroll position, pinned panels and restoration after closing.
- Logo visibility, uncropped facility imagery, QR downloads, receipts and print output.

DOM tests do not measure actual layout, colour contrast or real browser interactions. Existing regression tests do not establish live auth, bookings or payments work end to end. Keep this PR in draft until these checks are completed.

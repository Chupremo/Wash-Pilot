# WashPilot design review

Status: compact sandbox visual system implemented in the production source; live visual acceptance still required.
Reference: the separate WashPilot sandbox workspace, using the navy sidebar, warm yellow primary actions, pale blue-gray canvas, white cards, fine borders, and compact Inter typography.

## Unified visual system

The shared `washpilot-design.css` is the presentation layer used by all production entry pages.

| Element | Shared design |
| --- | --- |
| Main background | Pale blue-gray `#edf3f7` |
| Sidebar / dark panels | Deep navy `#081d37` |
| Active navigation | Muted navy `#263a53`, yellow left accent |
| Primary actions | Warm yellow `#ffbd2e`, navy text |
| Cards / top bars | White `#ffffff` |
| Borders | Soft blue-gray `#dce6ef` |
| Primary text | Navy `#102845` |
| Secondary text | Muted blue-gray `#657d99` |
| Typography | Inter throughout |
| Body / control text | 14px baseline |
| App page headings | 23–26px |
| Labels / table metadata | 11–12px |
| Controls | 44px minimum, 10–12px radii |
| Cards | 14–16px radii, restrained shadows |

## Coverage

All eight production HTML entry points reference the same cache-busted stylesheet:

- `index.html`: public marketing, directory, facility profile, online booking, dashboard, POS, and management/platform routes rendered within the main app.
- `home.html`: standalone marketing/home route.
- `dashboard.html` and `pos.html`: standalone workspace views.
- `signin.html`, `signup.html`, and `forgot.html`: authentication and recovery.
- `404.html`: error page.

The stylesheet is presentation-only. Existing HTML content, route definitions, JavaScript state, Supabase connections, payments, booking rules, account roles, plans, and permissions are not changed. Existing logos, 3D hero artwork, and facility images are retained.

## Validation

- The shared stylesheet is parsed with PostCSS.
- The design test checks that all eight entry pages reference the same stylesheet and that the compact sandbox tokens remain present.
- Inline JavaScript syntax and the existing dashboard, booking/payment and facility tests remain part of the repository's launch checks.
- DOM accessibility tests remain in `tests/design-validation.cjs`.

## Live visual acceptance still required

Check desktop and mobile:
- Marketing, sign-in, sign-up, recovery, directory and public facility booking pages.
- Dashboard, POS, queue, services, bookings, expenses, inventory, reports, branches and platform administration.
- Sidebar active states, drawers, bottom navigation, dialogs, tables, forms, keyboard focus and reduced-motion behaviour.
- Readability and contrast at 360px, 390px, 768px and 1440px.

This is a presentation-only change. No database migration or payment test is required. Existing business records and workflows should remain untouched.

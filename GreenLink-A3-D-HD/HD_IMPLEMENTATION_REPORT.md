# GreenLink Melbourne — A3 implementation and innovation report (draft)

## Scope and evidence
This report describes the supplied project and the changes in this version. Claims must be verified during the mandatory demonstration; it is not evidence of a deployed or fully tested system.

## P/C prerequisites
- D.1: Firebase Authentication login, registration, and email verification are present in `src/App.vue` and `src/firebase.js`. Test with an actual Firebase project.
- D.2 / E.1: `functions/index.js` defines a Firebase callable function that uses SendGrid to send an attachment to the verified signed-in email. Set Firebase secrets, deploy the function, and verify sender credentials before demonstrating.
- D.3: `src/components/DataTable.vue` provides two tables with global and per-column search, sort, ten rows per page, CSV and PDF export.
- D.4: Hosting configuration exists, but the public deployment has not been independently verified.
- E.2: `src/components/GeoActivities.vue` offers browser geolocation, distance calculation and sorting, and links to OpenStreetMap location/directions. To fully satisfy the map-based rubric, integrate a map directly into the application and demonstrate two meaningful map interactions.

## Distinction
- E.3: Accessibility features include skip navigation, accessible names on booking/review controls, status announcements, table captions, focus styling and text equivalents for the chart. **WCAG 2.1 AA compliance has not been certified**. Audit keyboard flows, contrast, responsive zoom, screen readers and error identification before submission.
- E.4: CSV and PDF exports exist on both searchable tables; exported records reflect current filtering. Check exports with actual data, including special characters.

## Innovation candidates
1. **Activity registration and capacity constraints**: existing `src/App.vue` allows one local booking per signed-in account and prevents booking when local capacity is zero. **Limitation:** localStorage is not multi-user conflict protection; use Firestore transactions and calendar constraints before claiming a robust booking system.
2. **Admin overview**: existing dashboard displays users, events and reviews. **Limitation:** data and role are browser-local; implement server-enforced admin claims and Firestore queries for a secure production dashboard.
3. **Interactive activity metrics**: new `src/components/InsightsPanel.vue` lets visitors switch chart metrics between capacity, planned trees and review counts. **Limitation:** these are in-memory values, not Firestore data; migrate to Firestore for the specified interactive-chart example.
4. **Offline conveniences**: new `InsightsPanel.vue` provides online/offline state announcements and locally persisted personal notes. Notes survive reloads in the same browser. **Limitation:** this is not a complete offline-capable application or service-worker cache.

## Recommendations for future upgrades
Move bookings, reviews, users and events to Firestore with security rules, atomic capacity updates and verified role-based access. Add a calendar view and reject overlapping bookings server-side. Use Firestore-backed chart aggregation, add a map widget and searchable POIs, and implement offline caching/synchronisation with clear conflict handling. Add automated tests, axe/Lighthouse accessibility audits and deployment smoke tests. Avoid exposing email API secrets in the client.

## Interview demonstration checklist
Show Firebase login and email verification; send a small attachment through deployed Cloud Functions; search/sort/page both tables; export and open CSV/PDF; test location and directions; navigate the entire form with keyboard; demonstrate chart metric changes, offline detection and notes persistence; explain the distinction between local demo state and secure server state; demonstrate deployed site and be prepared for live code changes.

## External setup still required
Firebase project configuration, enabled Authentication, deployed callable Cloud Function, SendGrid secrets and verified sender, hosting deployment, and full WCAG 2.1 AA testing. These operations cannot be completed from the supplied ZIP alone.

# GreenLink A3 Category E — Implementation Notes

## Install
Run `npm install` in the project root (new dependencies: jspdf, jspdf-autotable), then `npm run dev` or `npm run build`.

## E.1 Cloud Functions
Existing `sendAttachmentEmail` callable and Firebase integration retained. This package does **not** deploy a Cloud Function, set SendGrid secrets, or verify email delivery. Check `functions/index.js`: it may still contain the original Resend implementation from the uploaded ZIP; if you changed it locally, keep your latest SendGrid code. Firebase Functions requires Blaze billing for deployment.

## E.2 Geolocation
`src/components/GeoActivities.vue` implements browser permission-based location, straight-line distance estimates (Haversine), nearest-first sorting, and OpenStreetMap links/directions. Uses *approximate suburb-centre coordinates* for Clayton, Brunswick, Sunshine, **not** verified venue addresses. Replace with verified coordinates before claiming venue-accurate navigation. Browser geolocation works on localhost or HTTPS; permission is optional. No Firestore connection is added here: activity data is the existing local array.

## E.3 Accessibility
Added skip link, accessible auth input names, status announcement, focus outlines, reduced-motion preference, accessible table captions/sort labels, geolocation status. This is not a WCAG 2.1 AA certification. Run Lighthouse/axe, keyboard-only testing, contrast and screen-reader tests; fix any remaining findings.

## E.4 Export
Both Activities and Reviews tables retain CSV export and now have PDF export using jsPDF + jspdf-autotable. Exports **all filtered records**, not just the visible page. Verify generated PDFs. Default jsPDF fonts do not fully support non-Latin characters; use a suitable embedded font if exporting Chinese text.

## Test checklist
1. `npm install`, `npm run build`, `npm run dev`.
2. Login; verify original auth and D tables still work.
3. Allow location, check distances and nearest sorting; deny location and check fallback.
4. Open map and directions; confirm suburb-centre limitation.
5. Search/filter both tables, export CSV and PDF, inspect contents.
6. Keyboard Tab from page start to skip link; inspect focus and status messages.
7. Test existing D.2 separately after deploying your actual SendGrid Cloud Function.

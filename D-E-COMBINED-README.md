# GreenLink A3 — Categories D + E

This combines the existing Category E Vue project with the SendGrid version of the D.2/E.1 Firebase callable function.

## D requirements
- D.1 Firebase Authentication: existing login, registration and verification UI (requires configured Firebase project).
- D.2 Attachment email: existing Vue form -> `sendAttachmentEmail` callable function -> SendGrid API. SendGrid sender must be verified. Function deploy requires Firebase **Blaze** plan.
- D.3 Interactive tables: Activities and Reviews with search, column filtering, sorting, 10-row paging.
- D.4 Firebase Hosting configuration is included; actual public deployment is required.

## E requirements
- E.1 Cloud Functions: same callable email function, requires successful deployment and testing.
- E.2 Geolocation: `src/components/GeoActivities.vue`; approximate suburb-center coordinates must be replaced with verified venue locations before claiming precise navigation.
- E.3 Accessibility: initial improvements only. Must audit and test against WCAG 2.1 AA; no compliance guarantee.
- E.4 CSV/PDF export: `src/components/DataTable.vue`; test both downloads and review the rubric.

## Run
1. Copy your original `.env.local` into this project root; it is deliberately not bundled.
2. Run `npm install`, `npm run build`, and `npm run dev`.
3. For SendGrid (Blaze required):
   - `firebase login`
   - `firebase use greenlink-melbourne-78303`
   - `firebase functions:secrets:set SENDGRID_API_KEY` (enter the API key at the secure prompt)
   - `firebase functions:secrets:set SENDGRID_FROM_EMAIL` (enter your verified sender address)
   - `firebase deploy --only functions:sendAttachmentEmail`
4. For Hosting: `firebase deploy --only hosting`.
5. Verify a real email with an openable attachment. SendGrid HTTP 202 is acceptance, not confirmed delivery.

## Security
Do not put private API keys into `VITE_` variables or GitHub. The callable function currently disables App Check and lacks durable per-user rate limiting; this is a demo implementation, not a production-ready public mail relay. Firebase Blaze may incur charges.

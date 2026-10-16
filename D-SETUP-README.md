# GreenLink Melbourne — Category D setup

## What is implemented
- **D.1** Firebase email/password registration, login, logout and auth-state listener (in `src/App.vue`).
- **D.2** Authenticated email-to-self with PDF/PNG/JPEG/TXT attachment (up to 1 MB), using Firebase callable Cloud Function + Resend API. Only *verified* Firebase email accounts can send. Requires paid/billing-enabled Firebase Functions deployment and Resend domain verification; not live by default.
- **D.3** Two interactive tables: Activities and Reviews, each with global search, per-column search, column sorting and 10-row pagination (in `src/components/DataTable.vue`).
- **D.4** Firebase Hosting configuration, ready for deployment; a live URL is not created automatically.

## 1. Install and configure Firebase Auth
1. Run `npm install` in the project folder.
2. Copy `.env.example` to `.env.local`. Set the real Web API key and Web App ID from Firebase Console > Project settings > Your apps. The project ID and auth domain are prefilled for `greenlink-melbourne-78303`.
3. In Firebase Console > Authentication > Sign-in method, enable **Email/Password**.
4. Run `npm run dev`, register, log out and log back in. Verify the user in Authentication > Users.

## 2. Configure the email function
1. Ensure Firebase project `greenlink-melbourne-78303` is on a suitable billing plan for Cloud Functions. Consider budget alerts.
2. Sign up for Resend, verify a domain you control and create an API key. Use a sender address on that domain, e.g. `GreenLink <hello@your-verified-domain.example>`.
3. Install Firebase CLI: `npm install -g firebase-tools`; run `firebase login` and `firebase use greenlink-melbourne-78303`.
4. Run `firebase functions:secrets:set RESEND_API_KEY` and enter your Resend API key.
5. Run `firebase functions:secrets:set EMAIL_FROM` and enter your verified sender address.
6. Run `cd functions && npm install && cd ..`.
7. Run `firebase deploy --only functions`.
8. In Authentication > Users, open the test account and ensure email is **verified** (use a verification email workflow or a controlled test account). The callable function intentionally rejects unverified addresses.
9. Sign in to the site and send a PDF or TXT attachment to your own account address. Check inbox/spam and Functions logs if needed.

**Important:** Email is sent only to the logged-in user's verified email address to prevent an unrestricted email relay. A verified Resend sending domain is normally needed for delivery beyond provider test restrictions. Do not put Resend keys in Vue code, `.env.local`, GitHub, or public files.

## 3. Verify D.3 tables
Log in. In the Activity Data section, check both tables: sort headers, global search, column-specific search and page size <=10. There are only 3 seeded activities and initially 0 reviews, so add reviews for a meaningful test.

## 4. Deploy D.4
1. `npm run build` (must succeed).
2. `firebase deploy --only hosting`.
3. Open the generated `https://...web.app` or `https://...firebaseapp.com` URL.
4. Confirm Firebase Auth authorized domains includes your Hosting domain, then retest login, email and tables online.

## Limits
- Events, bookings and reviews are still browser-local demo data; Firestore migration is outside Category D.
- Firebase Functions deployment and Resend are external services and cannot be completed merely by downloading this project.
- Fulfilling the marking rubric depends on successful live testing and Tutor approval.

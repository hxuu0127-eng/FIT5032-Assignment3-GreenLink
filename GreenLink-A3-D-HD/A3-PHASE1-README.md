# GreenLink A3 Phase 1 — setup

1. Run `npm install`.
2. Create a Firebase project at https://console.firebase.google.com/ and register a Web app.
3. In Firebase Authentication > Sign-in method, enable **Email/Password**.
4. Copy `.env.example` to `.env` and replace placeholders with the Firebase web app configuration values.
5. Run `npm run dev` and test register/login, both searchable sortable paginated tables, and CSV export.

## Scope and limitations
- Implemented starter code for **D.1 Firebase Authentication**, **D.3 two interactive tables**, and **E.4 CSV export**.
- **Not yet implemented**: D.2 email attachment, D.4 live hosting, E.1 cloud functions, E.2 maps, E.3 full WCAG AA verification, and F.1 requirements.
- Original events and reviews still live in browser memory/localStorage; these are not shared Firestore data.
- Existing admin UI is not a secure admin role and is intentionally not enabled through client-controlled data. For production use Firebase custom claims + server-side security rules.
- Existing booking logic is local demo state, not a multi-user transactional booking system.
- Review the existing event dates (September 2026) and update them for your demonstration.
- Do not commit `.env` or service account keys.
- This zip contains source files only; npm will regenerate dependencies/lock metadata on install.

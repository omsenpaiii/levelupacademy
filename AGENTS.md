# Level Up Academy

Next.js App Router portal. Read relevant installed Next.js docs under node_modules/next/dist/docs before framework changes.

- Production data lives in Neon project divine-hat-86015127, branch production. Develop and test against branch development only.
- All staff mutations require a verified admin session. All student learning access requires active enrolment. Keep server checks on every mutation and private file download.
- Never seed test accounts, invented course lessons or unapproved assessments in production.
- Keep SSTA data, credentials and content out of this repository.
- Reuse the tokens and components in globals.css and components/ui.tsx. Review desktop and mobile renderings after UI changes.
- Stripe is phase 2. Manual admissions approval is the only automatic route from application to enrolment in phase 1.
- Run npm run typecheck, npm run lint, npm test and npm run build before shipping.

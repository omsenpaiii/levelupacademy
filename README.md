# Level Up Academy student portal

A standalone student and staff learning portal. The Wix marketing website remains at https://www.levelupacademy.vic.edu.au.

## Stack

Next.js App Router, TypeScript, Neon Postgres (Sydney), Drizzle, Neon Auth, and private Vercel Blob storage (Sydney). Authentication and data checks run on the server; course and assessment content is never publicly exposed through the catalogue.

## Development

Use Node 22 or 24 LTS. Run `npm ci`, populate `.env.local` using `.env.example`, then `npm run dev`. Use the development Neon branch and its corresponding authentication endpoint. Do not connect local tests to production.

`npm run db:generate` generates versioned migrations. `npm run db:migrate` applies them using the direct connection. `npm run db:seed` imports the verified Wix catalogue by slug without overwriting existing staff edits. See docs/content-review.md for content gaps and source inconsistencies.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Browser verification

With the development server running, run `npm run test:setup`, `npx playwright install chromium`, then `npm run test:e2e`. The setup creates synthetic accounts only on the isolated development branch and stores their random credentials in ignored `.qa/accounts.json`. These development test identities are marked verified through the test database; this is not a production email-delivery test. Integration tests cover admissions, learning, trainer feedback and resubmission, private files, LLN, access revocation, Excel import/export, responsive layouts and automated WCAG checks. Use the hosted production verification flow to test actual email delivery with a real recipient.

## First administrator

Register through `/auth/sign-up` and verify the email using the code. The operator then runs `npm run admin:grant -- verified-email@example.com` against the intended database. For production, use `ENV_FILE=.env.production.local npm run admin:grant -- verified-email@example.com`. No default administrator password or public role-escalation endpoint exists. Staff tools are at `/admin`.

## Operating the Academy

1. Students register, verify their email and submit a course application.
2. Staff review `/admin/applications`. Approval creates an active enrolment; declining an application does not revoke any separately granted enrolment.
3. Staff add modules, lessons, resources and approved assessments in `/admin/courses`. Drafts are hidden from students.
4. Students complete lessons and submit assessment responses/files. Trainers record satisfactory or not-satisfactory outcomes and feedback. Not-satisfactory outcomes allow another attempt; all attempts remain in history.
5. LLN activities use approved multiple-choice questions, server-side scoring and staff review. Answer keys are not sent to students.
6. Staff record course completion and certificate status separately from lesson progress. This portal does not issue qualifications automatically.
7. Excel enrolment import previews and validates every row, then imports atomically. Accounts must exist first. Imports do not send invitations or create passwords. Export student, application, enrolment and assessment records from staff tools.

Files are limited to PDF, DOCX, XLSX, PNG and JPEG, 20 MB. Private uploads are scoped to an authorised course/assessment. Downloads always recheck the session, ownership and enrolment. Video embedding supports YouTube, Vimeo and Google Drive; media permissions must also be set correctly at the video provider.

## Deployment

Vercel project: `levelupacademy`, `prj_ro1KdJv0PxX4l7pFQ4THOLhmXje9`.
Neon project: `divine-hat-86015127`.
Production branch: `br-winter-term-a7gdzxoh`.
Development branch: `br-misty-dew-a7k9j8j5`.

Configure production env separately from development. Add each production/preview URL to its Neon Auth trusted domains. Use only a development branch for preview deployments. Keep database URLs and Blob tokens out of Git.

Run migrations on development and test before production. For a rollout, apply additive migrations, deploy the verified Git commit, and smoke-test auth, catalogue, staff access and a private-file denial. To roll back UI/server code, promote the previous Vercel deployment. Do not roll back the database by dropping tables; use Neon restore/branching only after assessing data changes.

Runtime errors are visible in Vercel logs. Staff operations are recorded in `audit_events`. Do not log student responses, credentials or signed upload URLs.

## Wix connection (later)

Connect `students.levelupacademy.vic.edu.au` to this Vercel project using the DNS value provided by Vercel. Keep the existing apex/www and email records. Add the subdomain to Neon Auth trusted domains and update NEXT_PUBLIC_APP_URL. Add a Wix `/students` redirect and navigation item only when ready to direct students there. No Wix pages or DNS records are modified by this phase.

## Phase 2

See docs/phase-2.md. Payment features are intentionally absent in phase 1. Student access depends on staff approval, not a payment flag.

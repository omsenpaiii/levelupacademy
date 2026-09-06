# Deployment verification — 7 September 2026

Production: https://levelupacademy-five.vercel.app/students

## Configuration corrected

Neon production trusted origins now include the two Vercel aliases owned by this project: `levelupacademy-five.vercel.app` and `levelupacademy-omsenpaiiis-projects.vercel.app`. Removed the unrelated `levelupacademy.vercel.app` origin. Updated the production application URL and redeployed.

## Verified against production

- Genuine account registration and emailed OTP verification, with the account owner's participation.
- Automatic sign-in after verification, persistence after refresh, sign-out, and a fresh email/password sign-in.
- Authenticated profile save to Neon Postgres.
- Staff dashboard and course management access; authenticated Excel export.
- Password-reset request accepted by Neon. The owner completes the emailed reset link to select a private password.
- All 13 catalogue courses load. Anonymous staff export and private-file requests are denied.
- Desktop/mobile rendering, no mobile horizontal overflow, and no browser runtime errors during the smoke test.

Production contains the owner's real account and the source catalogue. No synthetic students, lessons or assessments were added. Approved teaching materials remain outstanding.

## Development verification

Isolated development accounts cover admissions approval, lesson completion, assessment submission/review/resubmission, LLN question authoring and scoring, private uploads/downloads, cross-user denial, enrolment revocation, Excel import/export and responsive navigation. Automated WCAG A/AA scans cover public dashboard, catalogue and authentication pages at desktop and mobile sizes. Automated accessibility checks supplement visual review; they are not a guarantee of complete accessibility.

Local type checking, ESLint, validation tests and production builds pass. Never copy development credentials or sample teaching content to production.

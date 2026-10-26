# FitLead online services V2

Live website: https://maolr3612-boop.github.io/fitlead-ai/

API: https://fitlead-health-api.maolr3612.workers.dev/health

The original FastAPI/PostgreSQL V1 remains available for local use. The published GitHub Pages frontend uses this separate Workers/D1 service; static hosting cannot run FastAPI itself. Cloudflare was provisioned through the connected Cloudflare plugin; GitHub publication used the existing authenticated Git Credential Manager account. No unrelated services or cloud resources were changed.

## What is live

- Searchable catalog of 876 community exercise text records (images deliberately excluded) and 8,156 USDA food records from SR Legacy April 2018 and Foundation April 2026. Missing nutrient values remain null. Query by common Chinese aliases, original English terms, FDC ID, equipment and experience.
- Eight rehabilitation education topics with source links and triage guidance. This is not a complete clinical rehabilitation database or autonomous prescription service. WHO material with non-commercial licensing is linked rather than copied wholesale.
- Server-calculated, validated rules plans for eligible adults. Body data, goals, experience, available equipment, time, dietary constraints, selected allergens and safety flags affect the plan. Seven-day baseline menus include item-level USDA identifiers and calculated nutrient totals.
- Hydration distinguishes total water, estimated water from the example food menu and a beverage reference. EFSA values are population references under stated conditions, not compulsory individual targets. Unknown restriction status suppresses a numeric drinking recommendation; known medical fluid restriction blocks automatic planning.
- Real account registration/login, anonymous-to-account ownership upgrade, cross-browser plan access after login, daily health logs, JSON export, one-time recovery codes, logout, consent withdrawal and permanent account deletion with password confirmation.
- No enabled LLM, email/SMS verification, payment or subscription. Plan generation is live deterministic computation and is clearly labeled as such. The online admin service is not configured; the local V1 admin remains separate.

## Storage/security

Health and contact records are AES-GCM encrypted using the owner ID as additional authenticated data. The production key exists only as a Worker secret; `.dev.vars` contains a separate ignored local key. Passwords use per-account random salts and PBKDF2-SHA256 (100,000 iterations, Workers Web Crypto); recovery/session tokens are stored only as SHA-256 digests. All private queries include owner ID. Sessions expire server-side after 7 days and are stored only in the current frontend tab's sessionStorage; the user can sign in on another device. There is no browser persistent “remember me” option.

Input is strictly schema-validated; JSON payloads are bounded. Prepared D1 statements prevent SQL interpolation. CORS explicitly allows the GitHub Pages origin and named development origins. Basic per-IP/per-username/per-user rate limits live in D1 rather than module memory. A daily UTC 19:00 cron removes expired sessions/rate buckets; personal health records remain until user deletion or operational cleanup. Health information is processed in Cloudflare's overseas infrastructure; the privacy page explains this before consent. No OpenAI request is made and no health record is written to GitHub.

This implementation has not had an independent clinical or security audit. Production onboarding at scale requires governance for jurisdiction, retention, abuse protection, recovery, privacy requests, incident handling, monitoring and clinician review. The code does not claim that all body types, conditions, allergies or goals can be safely handled automatically.

## Development

```powershell
cd fitlead-ai/online
npm ci
# Create .dev.vars containing DATA_KEY=<64 random hex characters> (never commit it).
npx wrangler types
npx wrangler d1 migrations apply fitlead-health-v2 --local
npm run dev
```

Frontend in another terminal:

```powershell
cd fitlead-ai/apps/web
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:8787'
npm run dev -- --port 3002
```

Static Pages build:

```powershell
$env:NEXT_PUBLIC_API_URL='https://fitlead-health-api.maolr3612.workers.dev'
$env:NEXT_PUBLIC_STATIC_EXPORT='1'
$env:NEXT_PUBLIC_BASE_PATH='/fitlead-ai'
npm run build
```

Static plans use `/plan/demo/?id=<private-plan-uuid>` as the shell; the UUID alone grants no read access. Next.js handles basePath for Links; explicit browser redirects use pageUrl/planPath helpers. GitHub Pages serves the built output, and the frontend calls the independent online API with a bearer token. The public data bundle has no keys or personal health records.

## Tests

Start local Wrangler before API tests. `npm test` requires the generated planning test bundle; create it with `npx esbuild src/planning.ts --bundle --format=esm --platform=node --outfile=dist/planning-test.mjs`.

```powershell
npm run check
npm run bundle
npm test
npm audit
```

Set FITLEAD_TEST_API to target the live test service. Tests create synthetic accounts and delete the tested account data. They never send email, charge a card or upgrade cloud billing. Browser tests run with `npx playwright test --config=playwright.v2.config.ts` from apps/web. FITLEAD_TEST_WEB and FITLEAD_TEST_PREFIX select local/static/live targets. The final report records each actual run.

## Data provenance and boundaries

`data/manifest.json` records exact source archive SHA-256 digests and import date. `data/sources.json` stores source URLs, usage/licensing limits and reference notes; `data/EXERCISES-LICENSE.md` preserves the upstream exercise-text license declaration. `tools/import-data.py` can re-import downloaded official archives. Raw archives and local state are ignored, not shipped as private data.

The planner uses a small deliberately reviewed ingredient subset from the larger searchable food catalog, not every food or every exercise. Weekly menus are a quantitative baseline repeated across the week, not a diverse long-term diet or a micronutrient-complete meal prescription. Values vary with preparation, brands, local foods and actual portions. Vegetarian protein references may differ from the animal-protein target; actual menu totals and limitations are shown. Two tested constrained plant-menu profiles safely require a nutrition professional rather than returning invalid portions.

Clinical-risk users, minors, unsupported ages/BMI, dangerous target weights, free-text restrictions and emergency flags are referred to professional assessment; serious acute symptoms are directed to urgent medical help rather than a sales consultation. Body measurements and BMI do not diagnose health, disease or body composition. The resource library is not asserted to be “the world's most complete” collection.

See [V2 acceptance report](../docs/V2_TEST_REPORT.md) and the live site's source/licensing tab for evidence and screenshots.

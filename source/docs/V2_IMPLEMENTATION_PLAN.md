# FitLead online health platform

1. Verify current GitHub Pages source and available plugin connections. Preserve current project and unrelated cloud resources.
2. Import traceable open nutrition/exercise datasets; create an evidence/source registry with licenses and dated versions. Rehabilitation is educational and triaged, not automated disease treatment.
3. Implement a separate deployable Workers/D1 API for real account sessions, private assessments, saved plans, hydration and personal daily logs. Preserve local FastAPI V1 compatibility.
4. Upgrade the existing Next.js UI with searchable resource library, hydration/safety details and account/history pages; support static GitHub Pages builds against the online API.
5. Validate safety, ownership, registration/login/logout/recovery/deletion, data import provenance and complete browser flows.
6. Deploy only task-specific cloud resources using the connected Cloudflare plugin; publish the supplied GitHub Pages site when repository write access is available. Record any remaining connection requirement truthfully.

Completed 2026-10-25: original GitHub Pages updated; independent Cloudflare Worker/D1 live. 876 exercise text and 8156 USDA food records imported with provenance. Six backend/parameter tests, 142 generated combinations and two explicit professional-review cases verified. Four public-site Edge journeys passed after fixing static-host navigation. No enabled LLM, payment, email verification or online administrator is claimed. See V2_TEST_REPORT.md.

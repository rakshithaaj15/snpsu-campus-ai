# SAPTHAGIRI AI CAMPUS

A unified campus-companion hackathon prototype with separate light/dark themes,
six one-click demo personas, and a connected campus portal.

## Explore the demo

Open `/demo` and choose Student, New Student, Parent, Faculty, Event Organizer,
or Campus Administrator. No credentials are needed. Demo profiles, events,
reports and notifications use sample data; changes persist in the current
browser, not a shared university database.

The portal includes Home / AI Assistant, Campus Map, Find Student, Campus
Discovery, Events & Activities, Event Management, Lost & Found, AI
Investigation, Report Issue, Campus Intelligence, Predictions, Notifications
and Profile / Settings. Public login/register and four-role demo onboarding
are separate from the one-click demo flow.

## Vercel import settings

Import this repository using **Root Directory `.`**, not a subfolder.
`vercel.json` supplies the build and routing configuration:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Node.js | 24.x |
| Package manager | pnpm 10.26.1 |
| Install command | `pnpm install --frozen-lockfile --prod=false` |
| Build command | `pnpm run build:vercel` |
| Output directory | `artifacts/sapthagiri-ai-campus/dist/public` |

No secrets are required for the sample-data experience. JSON demo-guide
functions are included under `api/`. Do not point them at a temporary Replit
development URL or put provider credentials in browser-exposed `VITE_*` values.

See [the complete Vercel handoff](docs/VERCEL.md) for deployment settings,
limitations, and post-import checks. Importing and publishing is a manual
owner action; no deployment workflow is enabled.

## Local validation

Before visual implementation, run `pnpm verify:reference`. The original is
read-only guidance, never an image-editor input or a replacement for functional
website components. Missing or changed source bytes stop the build and require
the exact original upload. Run `pnpm test:reference` for the four protection
checks. Both root production-build commands enforce this verification.

```sh
pnpm install --frozen-lockfile --prod=false
pnpm test:vercel
pnpm build:vercel
```

These checks can be run locally. A GitHub Actions workflow was prepared in
Replit, but the working GitHub App connection lacks workflow-upload permission.
Automated GitHub checks are not enabled in this repository yet.
The additional Replit production-browser smoke test is documented in
[docs/VERCEL.md](docs/VERCEL.md).

## Honest implementation status

Real Google/email authentication, live Gemini, verified academic records,
shared multi-user persistence, real campus GIS and camera access are **not
configured**. The assistant provides role/page-aware sample-data guidance,
with opt-in browser speech where available. It never silently enables billed
AI or pretends that a demo login is a real account.

The map is an interactive conceptual isometric schematic, not a verified
WebGL campus reconstruction. The architectural backdrop is a coded concept,
not the original reference photograph. All uploaded reference originals remain
unchanged, protected by SHA-256 integrity checks.

Read [the route and implementation audit](docs/CURRENT-AUDIT.md) before
describing the prototype as a production university system.

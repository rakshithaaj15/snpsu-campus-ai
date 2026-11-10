# SAPTHAGIRI AI CAMPUS — Vercel handoff

## Import settings

Import the chosen GitHub repository into Vercel yourself. Do not change the Root
Directory to the frontend subfolder: **use the repository root (`.`)**. The pnpm
workspace and serverless endpoints live at that root.

Settings are checked into `vercel.json`:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Node.js | 24.x (Vercel's current default, matching the tested workspace) |
| Package manager | pnpm 10.26.1 |
| Install | `pnpm install --frozen-lockfile --prod=false` |
| Build | `pnpm run build:vercel` |
| Output | `artifacts/sapthagiri-ai-campus/dist/public` |

Keep the complete repository: `artifacts/`, `lib/`, `api/`, `server/`, the pnpm
lockfile, workspace file, and TypeScript configuration are required. Do not
upload only `dist/public` if you want the JSON guide endpoints.

No secrets are required for this **demo**. Do not copy Replit's `PORT`,
`BASE_PATH`, development domain, managed Gemini proxy credentials, or
`SESSION_SECRET` to Vercel. This site builds for `/`. Never put provider keys in
`VITE_*` variables: those are public browser configuration.

## What works without integrations

- All public screens, six one-click demo personas, four-role demo onboarding,
  and all portal destinations.
- Local sample event management/registration, reports, investigations, privacy
  controls, notifications and theme settings. Browser storage persists local
  changes; it is **not** a shared university database.
- A top-left Back arrow on every screen, with safe in-app history and direct-link
  parent-page fallbacks. On the landing page with no history it is disabled.
- Role/page-aware sample guide and opt-in browser speech when supported.
- Vercel JSON endpoints `/api/campus-guide/status` and
  `/api/campus-guide/chat`. They explicitly return **demo**, never live Gemini.
  The frontend still has a local fallback when a network request fails.
- Deep links refresh to the SPA. Static assets and API endpoints are checked
  before the SPA fallback; unknown APIs return JSON 404, not `index.html`.

## Still not configured

Real email/password accounts, Google OAuth, live Gemini, verified academic
records, real campus GIS/routing, CCTV access, and shared multi-user persistence
are not configured. No source code or hosting configuration can create those
credentials or authorizations. Google buttons explain that limitation rather
than logging in a fake real account.

The Replit Express service is retained for Replit development. Vercel uses
small standalone demo functions, not an Express `listen()` process or a proxy
to a temporary `.replit.dev` address. Enabling live AI later requires a reviewed
Vercel-compatible server-side provider implementation and actual credentials;
setting an arbitrary API key does not activate this demo adapter.

Camera footage and unrestricted live student tracking are never available.
The campus map is an interactive conceptual isometric schematic, not verified
geography or a WebGL reconstruction. The provided image is a complete design
collage, not a standalone architectural photograph. All four original uploads
remain byte-for-byte unchanged. Exact photographic reproduction remains
dependent on separate authorized source photography.

## Local checks before importing

```sh
pnpm install --frozen-lockfile --prod=false
pnpm test:vercel
pnpm build:vercel
```

These checks validate local build/configuration and demo endpoint behavior.
They are not proof of a completed Vercel deployment. After you import, inspect
Vercel's build log and test `/demo`, direct refresh of `/portal/events`, both
themes, guide status, and browser microphone permissions over HTTPS.

A GitHub Actions workflow was prepared locally in Replit. The working GitHub
App authorization does not include workflow-upload permission, so that optional
file is not included in the GitHub handoff and automated GitHub checks are not
enabled yet. The seven local endpoint/configuration/reference-integrity checks
and production build have passed; use the commands above. Native Git upload
authorization still needs repair before the optional workflow can be added.

The additional local production-browser smoke test is:

```sh
pnpm --filter @workspace/scripts exec tsx src/campus-vercel-qa.ts
```

It serves the compiled site with the actual portable JSON handlers and checks
all 20 screens in both themes, six demo roles, Back history and query context,
sign-out boundaries, deep links, and 320/768/1440-pixel layouts. This script uses
the Replit-installed Chromium executable; it is not the GitHub Actions workflow.

Do not select `artifacts/api-server` or `artifacts/mockup-sandbox` as the Vercel
project root for this website. Do not override the checked-in output directory
with Vercel's generic `dist` default.

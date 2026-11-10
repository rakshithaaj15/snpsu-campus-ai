# SAPTHAGIRI AI CAMPUS

A unified AI-powered campus companion for Sapthagiri, created for the PromptWars / Smart Campus hackathon.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm verify:reference` — mandatory read-only reference check before visual work or a production build
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Theme preference belongs to the browser, not a campus role or login session. Preserve it when navigating or changing profiles; a deliberate reset of all demo preferences may reset it.
- Maintain one theme owner for the app and document metadata. Public pages, portal pages, dialogs, maps, and charts must consume the same resolved theme rather than maintain separate theme state.

## Product

The current priority is a polished, navigable frontend demo, not live campus services. Mock AI estimates, locations, and authorization must be clearly identified as illustrative. Real authentication and campus integrations are future work.

## User preferences

- Keep the complete fixed sitemap: Landing; Demo Experience (Student, New Student, Parent, Faculty, Event Organizer, Campus Administrator); Login/Register; onboarding (Student, New Student, Parent, Faculty); and the unified portal with Home/AI Assistant, Campus Map, Find Student, Campus Discovery, Events & Activities, Event Management, Lost & Found, AI Investigation, Report Issue, Campus Intelligence, Predictions, Notifications, and Profile/Settings.
- Audit the actual behavior of all ten blueprint capabilities, not just route names or styling. Every major module must have a believable working demo interaction and be reachable through one coherent portal.
- Authentication UI must include registration with name/email/password/role, email/password login, and Continue with Google. Until real authentication is connected, demo transitions must be explicit and passwords must never be stored.
- Start in bright/light mode with a premium, professional, futuristic 3D aesthetic, clean depth, glass surfaces, colorful accents, and subtle motion. Avoid cartoon characters and generic illustration-heavy styling.
- Light and dark are first-class, separately designed themes. Dark uses intentional near-black/navy glass, cool electric accents and readable luminous 3D depth—not inversion or simply dimmed light colors. Support a persistent accessible toggle and subtle reduced-motion-aware transitions.
- Use the unchanged approved reference for visual guidance. Do not introduce substitute campus images or cartoon building backdrops. Do not represent coded scenery as real campus photography.
- Live location is optional, not mandatory tracking. Location probabilities and lost-item investigation must communicate uncertainty; CCTV investigations are for authorized staff, not public access.

## Mandatory reference-image handling

- Canonical source: `attached_assets/Futuristic_University_Campus_Dashboard_1791531879550.png`, identified in `docs/approved-reference-integrity.json`.
- Read this original directly for visual comparison. It is a read-only specification, not a media-creation task.
- Never route it to Canva, any image editor, image-editing tools, image-generation tools, or an editable image canvas. Do not create adapted or regenerated copies.
- Preserve its bytes, pixels, dimensions, crop, colours, compression and every detail exactly. Never update the checksum just to accept a changed file.
- First run `pnpm verify:reference`. If the exact original is missing, unreadable, altered, or cannot be identified, STOP visual implementation and ask the user to upload the exact original into Replit. Do not substitute, recreate, regenerate or guess. Never claim an image was imported without an actual verified file.
- Build responsive, functional React/CSS components guided by the original. Do not display the reference collage in place of the website or extract/crop its photographic panel as a replacement background.
- Match its cinematic campus-photo composition, dark navy glass, electric-blue/gold accents, professional navigation, floating assistant and realistic map treatment. Preserve the complete sitemap, six demo roles, working interactions and separate light/dark themes.
- Do not claim photographic fidelity for an SVG illustration. The flattened board is not a separate campus photograph or a 3D model; report any missing source layer honestly instead of modifying the board to manufacture it.
- The user selected code-only UI improvements while photographic matching remains pending. The latest uploaded file is another byte-identical board, not a separate background. Do not repeat the photo-upload request or treat this duplicate as photographic background availability.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

## Frontend QA

Run from the workspace root:

- `pnpm --filter @workspace/sapthagiri-ai-campus run typecheck`
- `pnpm --filter @workspace/sapthagiri-ai-campus run build`
- `pnpm --filter @workspace/scripts exec tsx src/campus-browser-audit.ts` — blueprint interactions; repeat with `CAMPUS_TEST_THEME=dark`.
- `pnpm --filter @workspace/scripts exec tsx src/campus-full-qa.ts` — route/link/asset/runtime checks, accessibility, and 320/390/768-pixel layouts in both themes.
- `pnpm --filter @workspace/scripts exec tsx src/campus-edge-qa.ts` — all role onboarding, form failures, stale investigation prevention, reset/sign-out, and storage recovery.
- `pnpm --filter @workspace/scripts exec tsx src/campus-state-qa.ts` — populated dashboard contrast, predictions controls, issue resolution, and notification empty states.
- `pnpm --filter @workspace/scripts exec tsx src/campus-theme-audit.ts` — shared theme, persistence, OS preference, cross-tab updates, modals, and reduced motion.
- `pnpm --filter @workspace/scripts exec tsx src/campus-production-smoke.ts` — run after building; serves compiled files on a temporary localhost port to verify deep links and lazy-loaded assets. This does not publish the app or verify hosting configuration.

These checks use synthetic, isolated browser profiles and local demo data. Do not replace production authorization with test fixtures. Browser-storage fault tests exclude only the development banner script, which reads storage outside the application.

## Campus Guide

One in-memory conversation powers the Home assistant and persistent portal guide, including browser speech recognition and synthesis. Chat sends text and minimal synthetic context to `/api/campus-guide/chat`; it does not automatically include names, emails, SRNs, ownership secrets or finder records. Browser speech recognition may send audio to the browser vendor. Recording is user-initiated; closing the guide, navigating or signing out stops voice activity.

The provider status endpoint distinguishes demo mode from configured (not yet verified) Gemini. Only a successful Gemini response is labelled Gemini. No usable free Gemini credential was available when this feature was built; managed Replit Gemini is credit-billed, not free. Its SDK adapter is server-side only and requires existing managed configuration AND explicit `CAMPUS_GUIDE_ALLOW_BILLED_AI=true`. Do not provision or enable billed AI without approval. The prepared supported model is `gemini-3-flash-preview`; verify current support and costs before enabling. Missing configuration, request failure and timeout produce clearly marked demo guidance.

Campus data remains synthetic. Event registration and organizer publishing are not implemented; the guide must say so instead of inventing forms or links. Role context is demo context, not backend authorization.

Run `pnpm --filter @workspace/scripts exec tsx src/campus-guide-qa.ts` for API validation, shared conversation/navigation, voice adapter states, permission rejection, unsupported browser services, cancellation, API failure, modal accessibility and responsive light/dark checks. This uses simulated speech callbacks; it does not certify actual microphone hardware, browser-vendor service availability or physical audio output.

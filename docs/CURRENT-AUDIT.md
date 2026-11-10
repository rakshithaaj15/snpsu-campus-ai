# Campus website handoff audit

This is a functional frontend **demo**, not an integrated university system.
Keep that distinction visible in the product and any hackathon presentation.

## Navigable screens inspected

| Screen | Route | Meaningful interaction |
| --- | --- | --- |
| Landing | `/` | Demo, authentication and campus exploration links |
| Demo Experience | `/demo` | Six one-click personas, no password or onboarding required |
| Login | `/login` | Validated form and transparent unconfigured-authentication explanation |
| Register | `/register` | Name/email/password/role form; no fake real account creation |
| Onboarding | `/onboarding` | Four-role sample setup, provisional SRN and authorized sample ward |
| Campus preview | `/explore` | Campus exploration without pretending to be logged in |
| Home / AI Assistant | `/portal` | Role-aware greeting, timetable/orientation, quick actions and guide |
| Campus Map | `/portal/map` | Search/select, conceptual isometric view, routes and contextual overlays |
| Find Student | `/portal/find-student` | Authorized sample lookup, filters, uncertainty and parent ward scope |
| Campus Discovery | `/portal/discovery` | Facilities, orientation and map handoff |
| Events & Activities | `/portal/events` | Search, details, local demo registration, venue navigation |
| Event Management | `/portal/event-management` | Organizer/admin create/edit/publish/cancel/delete; other roles restricted |
| Lost & Found | `/portal/lost-found` | Local reporting/matching and hidden ownership challenges |
| AI Investigation | `/portal/investigation` | Narrative timeline, uncertain probabilities, targeted staff review request |
| Report Issue | `/portal/report-issue` | Classification, clarification, priority and local status |
| Campus Intelligence | `/portal/intelligence` | Staff evidence/priority/recommendations connected to local reports |
| Predictions | `/portal/predictions` | Time/date/event/report context; illustrative—not measured—estimates |
| Notifications | `/portal/notifications` | Read/dismiss, role-scoped registration notices and campus demo notices |
| Profile / Settings | `/portal/settings` | Theme, privacy, persona switching, reset and demo sign-out |
| Not found | unknown routes | Recovery navigation and Back fallback |

## Current pass

- Production frontend/shared-library type checks and build pass.
- 49 production-browser checks pass: 20 screens in each theme, six persona
  entries, and three viewport sizes. Additional Back checks preserve map query
  parameters and prevent protected-page history after sign-out.
- No browser runtime or console errors were observed in that focused pass.
- All four supplied original images match the recorded SHA-256 and dimensions.
- Vercel configuration targets the repository root and the correct frontend
  output; standalone JSON demo handlers are included.
- These local checks are not proof of a Vercel deployment. The GitHub handoff
  uses the authorized App API; the optional Actions workflow is omitted because
  workflow-upload permission is unavailable. Native Git authorization remains
  a separate unresolved connection issue.

## Limits and remaining gaps

Google/email production authentication and live Gemini are not configured.
The guide has a role/page-aware sample-data engine and optional browser voice;
speech availability and permissions depend on the user's browser. Previous
voice-state checks used simulated browser speech events, not proof of a
successful real microphone session on every device.

Photographic matching remains **explicitly pending**, as the user selected
code-only UI improvements. The old illustrated architectural hero is removed
in favor of intentional code-only interface surfaces, not replacement campus
imagery. All five uploaded files are byte-identical copies of the same
flattened design board, not separate photography or a 3D campus model. The
originals remain unchanged and are checked by `pnpm verify:reference`. Do not
claim photographic reproduction, edit/crop the board, or represent the
interactive conceptual isometric SVG map as a real WebGL campus reconstruction.

Real student location, campus measurements, official event registration,
verified academic data, camera feeds and production staff authorization are
not supplied. Local prototype permission checks are not production security.
Shared data between separate browsers requires a backend; current reports,
bookings and notifications are stored locally. Existing screens should remain
usable in demo mode while those integrations are unfinished.

# Safar — Your journey, your way

Existing Expo SDK **57** app, upgraded in place on 2026-10-21. Email/password authentication and the working optional Groq Edge Function are preserved. No social, phone or anonymous login was added. Manual planning does not call AI.

### Logo, Ocean Blue + Aqua theme, and real photography

Safar now follows the supplied globe/S logo: ocean blue `#0866C6`, aqua `#18C7BD`, white cards and pale-blue `#F5F9FD` backgrounds. The platform-independent source of truth is `src/constants/palette.ts`; native/web screens and itinerary exports share these tokens. Aqua buttons use dark labels for contrast. Error/success colors remain semantic, and budget charts have distinct shades and written category labels.

Complementary accents now give sections more variety: lavender for AI, peach/terracotta for social and cultural discovery, meadow green for nature categories, and warm cream for seasonal guidance. Blue/aqua remains the core brand.

The supplied PNG is preserved unchanged in `assets/images/safar-logo.png` and used in onboarding, authentication, Home and the export preview. Native icon/splash and web favicon settings also point to it. Native branding changes require a rebuild, not just a Metro reload; Expo Go controls its own launcher/launch screen. Check Android adaptive-icon clipping and prepare an opaque iOS App Store icon export before store submission.

Sign in/sign up now have a real Camps Bay photograph, explicit account tabs, focus-highlighted fields, a proper agreement checkbox and clearer email-verification/recovery layouts. Email-only authentication, mandatory verification and recovery handlers are unchanged.

Home cycles through five bundled photographs (Bali, Paris, Kyoto, Zermatt and Jaipur) every **7 seconds**, then repeats. Dots allow manual selection. Home and Explore search fields use live suggestions without a separate arrow button; the keyboard Search key still opens full results. Rotation stops off-screen/in the background and restarts on return. Six licensed Wikimedia images are bundled for offline use; see [photo credits](assets/photography/README.md) and tap the small **ⓘ** on a photo in the app for attribution/source/license.

Photo sizing explicitly overrides React Native's bundled-image intrinsic dimensions so cards show a fitted cover crop instead of a magnified corner. The Home banner reserves a separate photo area above its text and button. If you still see the old sky-only crop, stop Metro, run `npx expo start --clear` from `safar`, and reload Expo Go. No reinstall or data reset is needed.

Explore cards, destination details, trip cards/workspaces, AI previews and export previews share real-photo rendering. Curated photos are matched by exact name plus coordinates/country; other coordinate-backed destinations use the existing Wikimedia-backed Edge Function. Requests are cached, deduplicated and limited to two concurrently. Generic or unverifiable legacy cover URLs are not used as destination evidence; existing records are not modified. Missing/failed coverage shows a neutral placeholder, never unrelated scenery or an AI image. Custom names without location evidence may have no photo. External map tiles retain their original cartographic colors.

Remote photographs, including nearby attractions, now share loading/error/retry handling. For Commons thumbnails the app tries clean `upload.wikimedia.org` and `thumb.wikimedia.org` URLs, then the authenticated `safar-destinations` photo fallback. This fallback accepts only allowlisted HTTPS Commons raster paths, rejects redirects/non-image responses, enforces a 2 MB streaming limit and existing destination quotas, and returns image bytes without exposing backend secrets. The client deduplicates fallback requests, runs at most two concurrently and caches eight images in memory. Failed or stalled loads show **Tap to retry**, not an empty image area. Destination map controls align with the card edges; attribution sits below them.

Worldwide search does not mean every internet image is available for reuse: photo coverage depends on Wikimedia's location-matched, attributed media and provider availability. No Google key is required for this implementation. The device's specific remote-image failure remains unconfirmed; workstation image downloads pass, while Wikipedia metadata requests encountered HTTP 429 during the latest checks. Retest signed-in Android delivery on Wi-Fi and mobile data.

**Release status:** development build with deployed backend hardening, not public-release certified. See [RELEASE.md](RELEASE.md) for current deployment evidence, usage controls, licensing, and remaining blockers.

## Run the updated app

Requires Node 22.13+ and an SDK-57-compatible Expo Go or development build.

```bash
npm install
npx expo start --clear
```

Keep your existing mobile `.env` with the Supabase URL and publishable key. Never put Groq, service-role or other server secrets in `EXPO_PUBLIC_*`. A native development build needs rebuilding after adding native dependencies; restarting Metro alone only updates JavaScript. Expo Go includes the SDK-compatible maps and SVG modules.

New dependencies, installed with `expo install`:

- `expo-localization ~57.0.2`: device-aware new-account currency and calendar weekday ordering.
- `lucide-react-native ^1.60.0`: shared consistent icon library.
- `react-native-svg 15.15.4`: icons and category spending chart.
- `react-native-maps 1.27.2`: retained legacy native-map dependency.
- `react-native-webview`: SDK-57-compatible interactive OpenStreetMap embed on Android/iOS (exact version in package-lock.json).

The app remains on `expo ~57.0.30`. No SDK upgrade was performed.

## What changed

- Custom confirmation/error dialogs, Lucide icons, rounded forms, photographic onboarding, three-step email-verification guidance and resend countdown.
- Searchable Home, image-grid Explore with category chips and saved destinations, curated destination details, custom-location fallback, contextual map links.
- Six-step manual wizard with direct start/end selection, highlighted date range and DST-safe inclusive day count; profile currency/interests prefill.
- Destination Details → Plan Trip passes a serialized destination to `/create-trip?destination=...`. The wizard validates it, preselects it and starts at dates (step 2); Create/Home starts at step 1.
- Saved-trip workspace with day tabs, manual activities and place selection, booking filters/statuses, packing filters, expense donut, notes/photos, sharing and separate full-page workspace sections.
- Map screen uses saved coordinates and destination-specific landmarks. It never invents coordinates for custom text or fills unknown destinations with unrelated attractions.
- PDF preview/export screen includes itinerary, bookings, currency-separated expenses, packing and notes. User-entered HTML is escaped.
- Profile sections for personal details, preferences, saved places, collaboration, notification preference, password reset, sign out and typed-confirmation account deletion.
- New-trip AI previews support editing the name, travelers and budget. Saving preview details changes only the pending proposal; an explicit approval still creates the real trip. Destination/date/itinerary changes should be requested in chat. Groq generation is now bounded and validated; follow-up answers no longer prematurely create proposals.
- Trip lists refresh when revisited, drafts retain their status and offline trip-list caches are separated by account. Workspace sections refresh on focus.

## Database fix and deployed migrations

Connected project: `qyrqccrpdxbffshlhbdo`. The trip/map migrations and the subsequent avatar-storage migration were applied with Supabase MCP and verified afterward. No existing trips/users were dropped or reset.

The repeated-trip error was **not** a missing `user_id`: the client already inserted the verified current user. The SELECT policy called a STABLE helper that queried `trips` again; during `INSERT ... RETURNING` its snapshot could not see the new row. The fix adds an owner fast path while preserving member access:

```sql
alter policy "safar trips select" on public.trips
using (user_id = (select auth.uid()) or private.can_view_trip(id));
```

INSERT still requires `user_id = auth.uid()`; update/delete/membership authorization is not relaxed.

| Repository migration | Live migration version | Purpose |
| --- | --- | --- |
| [20261020235516_profile_avatar_storage.sql](supabase/migrations/20261020235516_profile_avatar_storage.sql) | 20261020235713 | Private 5 MB avatar bucket with owner-only read/upload/delete |
| [20261021002122_public_service_limits.sql](supabase/migrations/20261021002122_public_service_limits.sql) | 20261021002505 | Atomic service allowances, usage ledger, destination cache |
| [20261021002811_locale_profile_defaults.sql](supabase/migrations/20261021002811_locale_profile_defaults.sql) | 20261021002846 | Locale currency for new accounts only |
| 202610210001_safar_core.sql | 20261020215318 | Existing core/profile/workspace/storage schema |
| 202610210002_safar_hardening.sql | 20261020215410 | Existing policy hardening/indexes |
| 202610210003_trip_notes_index.sql | 20261020215442 | Existing notes index |
| 202610210004_safar_ai_workflows.sql | 20261020222646 | Existing conversations, proposals and approval RPCs |
| 202610210005_ai_proposal_result_index.sql | 20261020223132 | Existing proposal-result index |
| [202610210006_trip_insert_visibility.sql](supabase/migrations/202610210006_trip_insert_visibility.sql) | 20261020232138 | Owner visibility during INSERT RETURNING |
| [202610210007_activity_map_coordinates.sql](supabase/migrations/202610210007_activity_map_coordinates.sql) | 20261020232831 | Optional activity latitude/longitude, pair/range constraint |

Repository filenames preserve dependency order after the existing migration set. MCP assigned different live timestamps. **Do not blindly run `supabase db push` against this already-deployed project**: first reconcile migration history using the mapping above and inspect the SQL diff. The original core migration extends a pre-existing `trips` table; it is not an empty-project bootstrap.

### Profiles and security

`public.profiles` exists in the deployed schema, with all app-required columns. It was created/backfilled by the previous core migration. This upgrade confirmed its schema and tested authenticated upsert/read, rather than hiding schema-cache errors.

`getProfile()` reads only the current user's row. If that row is absent, it supplies initial form defaults; saving upserts the row with the authenticated user's ID. RLS restricts select/insert/update to that ID. Profile saves also keep the display-name auth metadata in sync.

All 18 Safar public tables have RLS enabled, expected foreign keys/policies/RPCs are present, and anonymous roles have no private public-table grants. The photo bucket is private. The rollback-only database regression in [supabase/tests/core_regression.sql](supabase/tests/core_regression.sql) passed against the deployed database.

Supabase security advisor still reports six intentionally authenticated SECURITY DEFINER RPC entry points and disabled leaked-password protection. The RPCs check callers/permissions and use an empty search path. Enable leaked-password protection in the Auth dashboard if supported by the project plan. No RLS was disabled to fix an error.

## Environment and backend services

Existing mandatory mobile variables:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

Optional/new configuration is documented in [.env.example](.env.example):

- No Google key is required by the current map implementation. `GOOGLE_MAPS_ANDROID_API_KEY` remains an optional legacy native-provider setting, not a requirement for the OpenStreetMap embed.
- `PHOTON_BASE_URL`: server-side Edge secret for the developer's Photon-compatible service. Suggestions/details now use the authenticated `safar-destinations` function.
- `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`: published HTTPS policies before public release. When unset, the app honestly identifies itself as a development preview.
- `EXPO_PUBLIC_GEOCODING_URL`: base URL of a Nominatim-compatible endpoint/proxy.

Public Nominatim is a development/limited-use default, **not a scalable production backend**. Search is explicit (no autocomplete), cached, attributed and spaced at least 1.1 seconds apart per app instance. The provider's limit applies to the application as a whole, so client throttling does not enforce its aggregate limit across users. Before public distribution, configure a compliant hosted provider/proxy with global rate limiting and caching. See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/). Overrides must expose the same response contract or use an adapter.

Native maps now use an interactive OpenStreetMap embed in react-native-webview; web uses the same provider in an iframe. The selected destination/place marker is shown; place chips change the selected pin. The map tab shows the map inline, without automatically navigating away. Custom destinations without coordinates have a text-search fallback. Activity place search is scoped near the trip center when available; saved manual stops remain user-controlled. Changing a trip destination does not move existing activities automatically. No live ratings, weather, hours, transport times or fabricated local recommendations are shown.

### Auth

Live public settings verified: email enabled, automatic email confirmation disabled, phone and anonymous signup disabled. The app additionally guards routes with verified-email state. Verify these redirect URLs in your dashboard before device tests:

```text
safar://auth
safar://reset-password
```

Expo Go return URLs can vary. Email confirmation also supports returning manually to sign in.

### Optional Groq

`safar-ai` was deployed and verified **ACTIVE, version 5, JWT verification enabled**; `safar-destinations` is **ACTIVE, version 2**, also JWT-protected, including the photo fallback. Retrieved deployed files match local source. Anonymous requests return 401. See [RELEASE.md](RELEASE.md) for quotas and provider cost controls. Keep `GROQ_API_KEY` in Supabase Edge Function secrets, not the mobile `.env`. The key's value was not read or logged. A fresh authenticated live Groq conversation and photo-fallback invocation remain device/account tests; database proposal editing/approval/idempotence passed independently.

## Screen and route map

| Reference screens | Route / behavior |
| --- | --- |
| 1 Onboarding | `/onboarding` |
| 2–4 Signup, verification, signin | `/auth` modes; `/reset-password` recovery |
| 5 Home | `/` |
| 6 Explore | `/explore`, optional category/query |
| 7 Destination details | `/destination?data=...` |
| 8–13 Manual wizard | `/create-trip`, six in-screen steps |
| 14–15 AI assistant/planning | `/safar-ai`, optional tripId/capability |
| 16 AI preview | `/ai-result?proposalId=...` |
| 17 My Trips | `/trips`, search and status/shared/archive filters |
| 18 Trip workspace | `/trip/[id]`, role-aware hub |
| 19–22 Itinerary, bookings, packing, budget | Hub tabs or `/trip-section?tripId=...&section=...` |
| Notes/photos | Hub tab or `/trip-section` |
| 23 Collaboration | `/invite?tripId=...`, `/join` |
| 24 Map | `/map?tripId=...` or destination data |
| 25 Export | `/export-trip?tripId=...` |
| 26 Profile/settings | `/profile`, section sheets |

Five bottom tabs remain Home, Explore, Create, Trips and Profile. Sensitive screens stay in the verified-session protected stack.

## Actual checks and remaining work

See [TESTING.md](TESTING.md) for exact results and the physical-device checklist.

Passed: TypeScript, lint, 14 pure-module tests, Expo Doctor 21/21, Android production JS export, web static export (19 routes), live database catalog checks, live Auth settings, rollback-only authenticated CRUD/RLS/proposal regression.

Not claimed: pixel-perfect visual parity or completed Android end-to-end QA. The in-app browser connection failed because its native bridge was unavailable; no browser screenshot comparison ran. A production JS export is not an APK installation test.

Remaining limitations/release tasks:

- Physical Android: keyboard/form reachability, calendar range selection, embedded map gestures/markers, email and recovery links, photo permission/upload, PDF print/share, custom modal stacking and navigation.
- Four-account SQL permission tests passed with rollback-only fixtures. Two real-account invitation/role tests and a live Groq chat test remain. Email-targeted invites create restricted shareable codes; Safar does not automatically send invitation emails.
- Notifications and language are stored preferences; scheduled push notifications and translated UI are not implemented. Wikimedia photos and Wikipedia/Wikivoyage travel notes load dynamically for searched destinations where coverage exists; curated featured notes remain a fallback. Photos require network/storage.
- Offline is read-only trip-list caching under a still-valid local session, not offline workspace editing/sync.
- The gray floating gear is not implemented by Safar source. Its actual source (Expo tooling versus Android accessibility overlay) needs comparison on the device/release build; no unrelated system control was removed.
- `npm audit --omit=dev`: 32 dependency findings (12 moderate, 20 high, 0 critical), including Expo/Metro/native-tooling transitive paths. No automatic breaking fixes were applied under the SDK 57 constraint. Resolve compatible advisories before release; the project is not claimed security-audit-clean.

## Public-app hardening and latest discovery/profile refinement

- Git checkpoint `66226b3` preserves the pre-hardening source.
- Atomic service-role-only usage reservations; verified-email Edge auth; bounded inputs, token reservations, timeouts, strict AI output validation, safe logs, and user-facing allowance hints.
- Server-cached sourced destination information and autocomplete. Worldwide coverage remains provider-dependent; custom destinations always work.
- Add discovered attractions to a selected trip/day with explicit confirmation and owner/editor RLS. Full map retains discovered nearby points and coordinate-specific directions.
- Calendar preserves a still-valid end date when start changes, localizes weekday ordering, and uses locale currency for new accounts without rewriting existing data.
- Profile → Privacy & security → Export my data shares a JSON export; includes accessible records, not original photos. Account deletion Storage cleanup remains a release blocker.


- Home Quick Actions now contains only My Trips, Join Trip and Safar AI. The hero and spacing are more compact, moving subsequent content upward.
- Home, Explore and Create Trip now suggest destinations while typing (650 ms debounce, minimum 3 characters, abort/stale-result protection, small in-memory cache). Enter/search and custom locations remain available. Suggestions use [Photon](https://github.com/komoot/photon), whose demo API permits reasonable light use, not unlimited production load. Use your own hosted provider for a public release.
- Per the user's choice, **real Wikimedia photos are used instead of Google Places photos**. Detail pages resolve a location-matched Wikipedia article, retrieve free-photo author/license metadata from Commons, show nearby places and fetch climate/season guidance from a coordinate-checked Wikivoyage article. Source/license links are displayed. Unknown places may lack photos or seasonal notes; a clearly labeled local travel-inspiration image is used when a real destination image is unavailable. Dynamic photos are not copied into legacy trip-cover fields without attribution.
- Travel Preferences and Preferred Currency have separate panels.
- Tap the avatar or use Personal Details → Choose profile photo. JPEG/PNG/WebP, 5 MB maximum; stored privately in `safar-avatars/<user-id>/...`. `profiles.avatar_url` stores an `avatar://...` reference, not an expiring signed URL. Home/Profile resolve a fresh signed image on focus. Remove Photo restores initials. Replaced/removed private blobs are retained to avoid deleting a concurrent device's active upload; lifecycle cleanup is not yet implemented.
- Supabase skill security checks guided the private avatar bucket and account-scoped policies. Owner metadata read/upload and cross-account denial passed in a rollback-only test. Real image picking/upload remains a device test.
- Live provider smoke test: `node scripts/check-destinations.cjs`. Hyderabad returned India/Pakistan suggestions, a real credited photo, six nearby places (including Charminar and Chowmahalla Palace), and seasonal guidance.

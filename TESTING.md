# Safar test checklist

## Direct email verification deep linking (2026-10-21)

- Diagnosed and resolved the `localhost:3000` / `ERR_CONNECTION_REFUSED` bug: Supabase defaulted Site URL to localhost:3000 and the app lacked a designated email confirmation redirect URL on the allowlist.
- Configured unique custom app URL scheme `["safarapp", "safar"]` in `app.json` (supporting both `safarapp://` and `safar://` deep links).
- Implemented dedicated public callback screen `src/app/email-confirmed.tsx` with premium rounded card, mint/white background (`colors.accentSoft`), check illustration in `colors.accentStrong`, heading "Email Verified Successfully!", subtitle "Your Safar account is ready.", and "Continue to Sign In" button that routes to signin with confirmed email prefilled.
- Added comprehensive error handling for expired, invalid, and already-used links with helpful explanation and actions ("Return to Sign In" and "Request New Link").
- Strict security check: verification confirms `email_confirmed_at` with Supabase server via `getUser`/`exchangeCodeForSession`/`verifyOtp` and immediately clears local session (`signOut({ scope: 'local' })`), ensuring user is NOT automatically signed in simply by tapping the link.
- Updated `src/app/auth.tsx` signUp and resend flows to pass `emailRedirectTo: 'safarapp://email-confirmed'`.
- Updated `src/utils/auth-routing.ts` with `parseEmailConfirmationLink` supporting tokens, code, token_hash, errors, and empty links across `safarapp://`, `safar://`, Expo Go, and web.
- All 51 automated tests passed (`npm test`). Lint passed with 0 errors/warnings (`npm run lint`). TypeScript passed (`npx tsc --noEmit`). Expo Doctor passed 21/21.
- Android production bundle export (`dist-android-final`) and static web export (`dist-web-final` with 20 static routes including `/email-confirmed`) verified.

## Google Sans typography integration verification (2026-10-21)

- Bundled official static Google Sans Regular (400), Medium (500), and Bold (700) font files from the Google Fonts release (`https://github.com/googlefonts/googlesans`), licensed under SIL Open Font License (OFL) 1.1 (`assets/fonts/OFL.txt` and `assets/fonts/README.md`).
- Centralized typography architecture via `src/constants/typography.ts`, `src/components/ui/Typography.tsx`, and `src/app/_layout.tsx`. All app-owned screens and components route `Text` and `TextInput` through the typography wrapper, preserving refs, accessibility props, scaling, and explicit monospace styling, with graceful fallback to system fonts if font loading fails.
- Resolved ESLint type-redeclaration warnings in `src/components/ui/Typography.tsx`. Lint passes with zero errors and zero warnings.
- All 50 automated tests pass (`node --test scripts/*.test.cjs`), including 5 typography-specific test suites verifying static font headers/tables, layout/accessibility props, TextInput refs and handlers, system fallbacks, and full app-owned import coverage across `src/`.
- TypeScript (`npx tsc --noEmit`) passes with zero errors. Expo Doctor (`npx expo-doctor`) passes 21/21 checks.
- Android production bundle export (`dist-android-final`) and web static export (`dist-web-final`) verified with all three Google Sans TTF files successfully included and hashed in `metadata.json`.

## Search and photo-control polish (2026-10-21)

- Removed the shared search-field arrow used on Home and Explore. Live suggestion selection, clear search, custom destinations and keyboard Search submission remain available.
- Replaced the prominent `© Photo` pill throughout shared photo rendering with a small, subtle `ⓘ` control. Attribution/source/license access and a larger invisible touch target are preserved.
- Home's five-photo slideshow now advances every 7 seconds (full loop: 35 seconds); focus/background cleanup is unchanged.
- All 45 automated tests, lint and TypeScript passed. New checks cover arrow removal, retained search controls, compact credit access, the 6999/7000 ms timing boundary, wraparound and timer cleanup. Device appearance/taps still require Android verification.

## Searched destination / attraction photo delivery (2026-10-21)

- Live Supabase cache contains attributed photos for Hyderabad, Charminar, Laad Bazaar and other nearby attractions. Exact cached Charminar URLs returned JPEGs on both Wikimedia image hosts; the device-specific failure is not conclusively reproduced.
- Shared photo rendering now strips tracking, tries both Commons thumbnail hosts, then uses a protected binary fallback. Loading, stalled requests, errors and retry are visible. Nearby attractions use the same renderer. Map-button right padding was removed and the photo credit moved below the controls. Lavender, peach and meadow accents preserve the primary blue/aqua palette; contrast checks pass.
- All **43 automated tests passed**, including URL allowlisting/SSRF rejection, redirect refusal, HTML/oversized response rejection, real fixture byte preservation, client queue/cache/retry tests and existing regressions. TypeScript, lint and Deno checking passed. Android bundle and web export (19 routes) passed to `/private/tmp/safar-remote-photos-20261021`.
- Live network checks of the fallback's actual byte-fetching implementation passed: Hyderabad (328387 bytes), Charminar (537018), Laad Bazaar (531867), Paris (334704), Kyoto (367380), Bali (290124); all JPEG signatures verified. These were workstation provider checks, not signed-in deployed requests.
- `safar-destinations` v2 verified ACTIVE, JWT verification enabled; all eight retrieved deployed files exactly match local files. The deployed photo endpoint rejects an unauthenticated request with HTTP 401. No schema, user/trip data, verification rules or service quotas changed. Existing advisor notices remain unchanged.
- The full discovery network smoke **failed** during this run: Wikipedia API responded HTTP 429, so new metadata could not be verified live. The smoke test now checks actual image bytes as well as photo metadata. Existing backend cache remains intact.
- Remaining physical tests: reload Expo Go; search Hyderabad India (also distinguish Pakistan), open all nearby photos including Charminar, check map icon alignment, test image retries on mobile data/Wi-Fi, and verify the signed-in Edge photo fallback. Android UI and authenticated fallback have not been end-to-end verified here.

## Android photo cropping fix (2026-10-21)

- Root cause: bundled React Native images prepend intrinsic width/height; `absoluteFill` alone did not override those values. The shared `TravelPhoto` now explicitly sizes images to 100% of their container before applying a cover crop. Home copy/CTA is outside a dedicated photo region, no longer covering the scenery.
- All 36 automated tests passed, including three new structural render regressions for bundled/remote image sizing, honest missing-photo placeholders, and Home's separate photo region. These tests inspect component props with mocked native primitives; they do not exercise Android Yoga rendering.
- TypeScript and lint passed. Android production bundle and web export (19 routes) passed to `/private/tmp/safar-photo-layout-20261021`. SDK 57 and all backend/data settings are unchanged.
- Physical Android retest required: reload Expo Go; inspect Zermatt's mountain/village and Jaipur's facade on Home and Explore; check auth and destination covers; tap all five hero dots, then confirm one-minute automatic rotation. No physical device visual verification was available during this fix.

## Logo / real photography / authentication redesign (2026-10-21)

- All 33 automated tests passed: 60-second slideshow timing/wrap/cleanup, five unique photos, bundled JPEG and credit checks, exact-location versus namesake/custom matching, request deduplication/concurrency/cancellation/retry, theme contrast, auth routing and existing core tests.
- TypeScript, lint, Android bundle and web export passed. Expo Doctor: 21/21 checks passed (rerun with network access after the sandboxed registry check failed). The supplied logo copy has the identical SHA-256 hash as the attachment; no logo generation/editing was performed.
- Live public-provider smoke test passed for Hyderabad: suggestions include India and Pakistan, the India result has a credited photo, six nearby places and seasonal notes. This tests provider integration, not an authenticated phone session through the Edge Function.
- Supabase MCP reports existing `safar-destinations` v1 and `safar-ai` v5 ACTIVE with JWT verification. No database migrations, auth settings or Edge Function deployments were needed for this UI/photo change.
- Browser visual review was unavailable because the browser connection could not initialize. Physical Android testing remains required: keyboard reachability, sign-in/signup/verification/recovery, credit dialog taps inside cards, background/resume timer behavior, five-photo rotation at 60/120/180/240/300 seconds, cold/offline launch and slow/failed destination photo loading.
- Rebuild a native app to inspect the new launcher/splash logo (including adaptive icon masking). Metro reload updates in-app branding, not Expo Go's launcher. An opaque iOS icon export is still needed before App Store submission.
- Existing data and stored cover URLs are preserved. Unverifiable cover URLs are ignored by destination presentation; custom destinations without sufficient location evidence and missing-provider coverage use neutral placeholders. The old generated mountain file is retained on disk but has no source references.

## Deleted-account / password-reset launch fix (2026-10-21)

- Reset Password is protected by an explicit, non-persisted recovery flow, not an always-accessible fallback route.
- Startup and foreground restoration check the cached account with Auth `getUser`; invalid/deleted accounts are locally signed out. A still-valid offline session is not mistaken for a deleted account.
- Valid token-pair and PKCE reset links remain supported; a bare `/reset-password` route or ordinary Expo QR does not enable recovery.
- TypeScript and lint passed; 22 automated tests passed (8 new auth/session/routing regressions). These simulate Auth responses, not actual account deletion on a phone.
- Physical retest: close Expo Go, scan the normal Metro QR with the deleted account still cached, and expect Sign in/Create account. Then test a new genuine recovery email, Back to sign in, successful password update, restart, and dashboard deletion while the app is backgrounded. First-ever installs still show onboarding.

## Automated checks

Run from the repository root:

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor@latest
npx expo export --platform android --output-dir /tmp/safar-android
```

Last run on 2026-10-21: TypeScript passed, lint passed with no warnings, all 14 automated tests passed, Expo Doctor passed 21/21, Android production JS export passed, and web static export passed for all 19 routes. Native APK installation and visual UI verification are not covered by these exports.

Core tests exercise actual date, destination/map and HTML-export modules: DST/leap-day ranges, custom/malformed destinations, valid zero coordinates, invalid coordinates, context-safe direction queries, unknown destination fallbacks, escaping/sorting/currency separation and empty export sections.

The in-app browser could not connect (native bridge unavailable). No browser screenshots or physical Android end-to-end tests were run during this upgrade. Compare the app with the supplied infographic on the device.

## Hosted backend checks completed

- Supabase migration history includes prior migrations plus `public_service_limits` and `locale_profile_defaults`. See README for the exact local/live timestamp mapping.
- Existing records preserved; catalog counts can change as the user continues using the app. Four synthetic account fixtures were verified absent after rollback. No test account/trip is left behind.
- The existing profile was backfilled; authenticated profile select and update were tested under RLS.
- All 18 public tables have RLS enabled; all expected functions, policies, foreign keys, indexes and the private `trip-photos` bucket were catalog-checked.
- Owner-level CRUD was exercised for the modules enumerated in the regression test below; storage uploads and multi-account collaboration still need device/account tests.
- `safar-ai` v5 and `safar-destinations` v1 deployed ACTIVE with JWT verification. Deno checks pass, retrieved deployed files match local source, anonymous HTTP calls return 401. A fresh authenticated Edge/Groq call was not made.
- [core_regression.sql](supabase/tests/core_regression.sql) passed live under the authenticated role: two consecutive trip INSERT RETURNING operations, profile upsert/read, trip update/archive/restore/delete, activity CRUD, booking/packing/expense/note CRUD, invalid map-coordinate rejection, pending AI preview edit, explicit approval and idempotence. An unrelated JWT subject could neither read the trip/profile nor insert an activity. All writes rolled back.
- Required foreign keys, activity-coordinate constraint, profile columns and six public RPCs verified. No anonymous private-table grants; photo bucket remains private.
- Public Auth settings: HTTP 200, email enabled, automatic confirmation false, anonymous/phone disabled.
- Security advisor: six expected SECURITY DEFINER RPC warnings and disabled leaked-password protection. Dependency audit: 32 findings (12 moderate, 20 high, zero critical); no breaking upgrades applied.
- Updated destination-provider network smoke passed for Hyderabad (India/Pakistan, licensed photo, nearby places, seasonal notes). This is a workstation provider test, not a signed-in Android/Edge end-to-end test.
- [public_release_regression.sql](supabase/tests/public_release_regression.sql) passed live with four rollback-only account fixtures: editor/viewer/outsider permissions, wrong-email denial, invitation acceptance, revocation, new-account currency, service-only quota grants, per-user/global request and reservation budgets.
- Three new RLS-without-policy advisory notices are intentional service-only deny-by-default tables. Six existing authenticated RPC notices and disabled leaked-password protection remain.

For current public-release gates, source licensing and operator controls, read [RELEASE.md](RELEASE.md).

## Auth on a physical Android device

1. Sign up with full name, valid email and an 8+ character password.
2. Confirm that protected screens remain inaccessible before email confirmation.
3. Resend verification, open the installed email app, follow the real link and return to sign in.
4. Restart Expo Go and confirm the verified session persists.
5. Send a password-reset email, open the newest link, update the password and sign in again.
6. Sign out and confirm protected routes are removed from navigation history.
7. In the Supabase Auth dashboard, confirm **Confirm Email** is enabled and both `safar://auth` and `safar://reset-password` are allowed redirects.

## Core planning

1. Search a city, village, island and landmark; also test a manual custom destination.
2. Complete all six Create Trip steps without invoking AI.
3. Create a second trip immediately. Confirm both appear on Home/My Trips when revisiting, then force-close/reopen and continue editing.
4. From Destination Details, tap Plan Trip; confirm step 2 opens with the correct location retained. Test Create tab starts a fresh step 1.
5. Edit, duplicate, archive and delete separate test trips.
6. Add/edit/delete/reorder/move itinerary activities and open activity directions.
7. Add/edit/delete each booking, packing item, expense and note; verify packing/budget progress.
8. Upload and remove a photo, export a PDF and open destination directions.

## Collaboration and authorization

Use two verified accounts in separate sessions:

1. User A creates a trip and editor invitation; User B accepts it.
2. Confirm B can read and edit workspace content but cannot delete the trip or manage members.
3. Change B to viewer and confirm every database write fails even if attempted outside the UI.
4. Confirm unrelated User C cannot select the trip or child rows.
5. Test wrong-email, expired, revoked, reused and rejected invitation codes.
6. Confirm signed photo URLs cannot be created by a non-member.

## AI failure behavior

1. Test with `GROQ_API_KEY` absent, invalid and rate-limited.
2. Confirm a useful error appears and manual CRUD still works.
3. From Home, ask Safar AI to create a trip with only a destination; confirm it asks for dates and traveler count without inventing them.
4. Supply the missing details, open the result screen, leave and reopen the conversation, and verify the pending proposal is restored.
5. Choose Cancel/Keep Original and verify no data changes.
6. Edit name/travelers/budget in preview; verify no saved trip changes until confirmation. Confirm twice and verify only one resulting trip exists.
7. Apply itinerary and packing previews as owner/editor and verify only the reviewed items are inserted.
8. Sign in as a viewer: trip questions should work, while change proposals must be rejected server-side.

## Android UI/device-only checks

1. Confirm the keyboard resizes every form and the active input plus primary button remain reachable on small screens.
2. Test the new date-range calendar: tap start/end, navigate months, select a one-day/cross-month trip, and edit an existing trip.
3. Verify map markers for the selected destination and saved activity coordinates; custom addresses must show a fallback, not unrelated city pins. Test Expo Go and a rebuilt standalone app; maps now use a key-free OpenStreetMap WebView.
4. Verify email-app intent, gallery permission, private image upload, PDF preview/print/share and external directions.
5. Compare Expo Go and a release/development build. If the gray floating gear appears only in Expo Go, it is development tooling; if it remains, inspect Android accessibility floating controls. Safar itself contains no floating gear component or asset.
6. Verify the first-run onboarding appears once, Get Started opens signup, Sign In opens signin, and a verified returning user bypasses onboarding.
7. Verify the Safar AI composer remains above the keyboard and long proposal pages scroll correctly on a small Android phone.

## Database verification queries

Use authenticated test clients rather than a service-role key. Confirm RLS is enabled for every public Safar table, `anon` has no private-table privileges, and existing unknown `trips` policies are reviewed before release.

## Earlier Orange + Navy palette (superseded by Ocean Blue + Aqua above)

- All 27 automated tests passed. Added checks for the chosen brand values, 18 text/background contrast pairs at 4.5:1 or better, distinct chart colors, shared export/launch colors, and no leftover teal/purple branding in screen source.
- TypeScript, lint and Android/web exports passed (19 web routes). Native props, auth routing and existing data/export tests remain covered.
- Interactive browser review could not run because the browser connection failed to initialize. No device screenshots or visual-parity pass are claimed.
- On Android, review onboarding/signin, email verification, all five tabs, each trip wizard step, selected calendar dates, AI chat/preview, dialogs and workspace modules. Check bright-photo hero text, orange button labels, disabled states, keyboard inputs, status-bar appearance and PDF preview/share.
- Existing launcher artwork and external map tiles retain their original colors; the shared UI theme does not recolor travel photos. Rebuild the native app to see changed native launch background settings; Expo Go controls its own launch presentation.

## Icon web accessibility regression (2026-10-21)

Reproduced two React DOM warnings caused by forwarding `accessibilityElementsHidden` and `importantForAccessibility` to SVG elements. Icons now use web accessibility attributes on web and retain native accessibility properties on Android/iOS.

Verification: all 24 automated tests passed, including actual React/Lucide/SVG web rendering with no console errors and native prop/alias/fallback checks. TypeScript, lint, and web export (19 routes) passed. This is automated rendering/build coverage, not a physical Android or interactive browser test.

Start Metro from the app folder (`cd /Users/hetjaviya/Desktop/Projects/safar`, then `npm start -- --clear`). Running `npx expo start` in the parent folder can prompt installation of an unrelated latest Expo version; Safar remains on SDK 57. If port 8081 is occupied, stop the other Metro terminal with Ctrl+C or accept an alternate port.

## Discovery/profile follow-up

Automated: TypeScript and lint passed; 14 tests passed; Expo Doctor 21/21; Android and web exports passed. Live `node scripts/check-destinations.cjs` passed for Hyderabad (India/Pakistan suggestions, real photo with attribution/license, nearby attractions, seasonal guide). Avatar bucket verified private with a 5 MB limit; owner insert/read and cross-account denial passed under authenticated JWT claims, then rolled back.

Device checklist:

1. Home Quick Actions has only My Trips, Join Trip and Safar AI; later sections sit higher.
2. Type “Hyder” without pressing Enter on Home, Explore and Create Trip; suggestions appear. Select Hyderabad, India, then Pakistan separately; country/coordinates must stay correct.
3. Rapidly replace/clear a query and navigate away; old results must not replace the current search. Test unavailable network and custom destination.
4. Open a destination and verify real photo attribution links, nearby places, seasonal notes and their sources. Coverage gaps should show truthful fallback text.
5. Map tab remains inline. Zoom/pan and select place chips. Verify the marker changes and directions open for that exact coordinate.
6. Currency opens only currency choices; Travel Preferences opens only interests.
7. Tap avatar; select/crop a JPEG/PNG/WebP under 5 MB. Verify it appears on Profile and Home, survives restart, and Remove Photo restores initials.
8. Test cancellation, rejected format/oversized image and lost upload connection.
9. Browser visual review remains unavailable because the browser connection could not initialize; no screenshots or Android end-to-end results are claimed.

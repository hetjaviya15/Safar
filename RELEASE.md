# Safar release gate — 2026-10-21

Status: improved development build, **not approved for public release**. Expo remains
57.0.30. The 26 reference experiences map to existing routes/modes in README;
they have not all been visually compared or exercised on a physical Android phone.

## Changes and deployment evidence

- Git safety checkpoint: `66226b3` (pre-hardening source; no secrets).
- Supabase skills guided additive migrations, server-only grants, RLS checks and
  rollback-only tests. No real account or trip was deleted by this work.
- `public_service_limits`: live migration `20261021002505`; repository
  `20261021002122_public_service_limits.sql`.
- `locale_profile_defaults`: live migration `20261021002846`; repository
  `20261021002811_locale_profile_defaults.sql`. Only new accounts get locale-based
  currency; existing preferences and trip currencies are untouched.
- `safar-ai` v5 and `safar-destinations` v2 are ACTIVE, JWT verification on. Destination v2 adds an authenticated, allowlisted Commons photo-delivery fallback with a 2 MB response limit and the existing destination quotas; no schema changes. Deployment files match local source and anonymous photo calls return 401. Signed-in device fallback testing remains required; latest Wikipedia metadata smoke hit HTTP 429 (see TESTING.md).
  Deployed source was retrieved and compared with local files: all matched.
  Anonymous HTTP probes returned 401 for both.
- All 18 public tables have RLS. The three new service/cache tables deliberately
  have **no client policies or grants**: service role only. All public foreign
  keys are validated. Four synthetic accounts used by SQL tests were rolled back.

## AI operations

No end user configures any provider. Keep `GROQ_API_KEY` and optional `GROQ_MODEL`
only in Edge Function secrets. The service-role key is supplied by Supabase's
runtime, never the app.

The developer can adjust `public.service_limits` in the SQL editor. Default AI
limits are 3 requests/user/minute, 20/user/rolling 24h, 20 globally/minute,
100 globally/rolling 24h, 100,000 reserved units/user/day and 200,000 globally/day.
These are **Safar controls, not a promise of provider capacity**. Disabling the
`ai` row stops new AI calls without affecting manual planning.

Reservations serialize using a database row lock across Edge instances. A
reservation uses UTF-8 prompt/schema bytes + 4,024 units (output cap and overhead),
not an exact tokenizer count. It remains charged on failures/timeouts; actual
reported token usage is logged separately. Chat deletion cannot reset it.
Input is capped at 8 KB (1,500 request characters), total prompt/schema at 28 KB,
completion at 3,000 tokens, provider response at 64 KB, JSON content at 24 KB.
The 25-second timeout covers response reading. Nested fields, real dates,
traveler limits, costs, times and activity day ranges are validated.

The [Groq model page](https://console.groq.com/docs/model/openai/gpt-oss-120b)
currently lists $0.15/M input and $0.60/M output tokens for GPT-OSS 120B
(checked 2026-10-21). [Rate limits](https://console.groq.com/docs/rate-limits)
are organization-level and plan-specific; inspect your actual console limits and
configure provider spend limits before launch. Safar limits do not prevent other
applications using the same Groq account from consuming its quota.

Monitor without logging prompts, keys or booking details:

```sql
select service, outcome, count(*), sum(reserved_units), sum(actual_units),
       round(avg(duration_ms)) as average_ms
from public.service_usage
where created_at > now() - interval '24 hours'
group by service,outcome;
```

Usage retention and cache expiry cleanup need a scheduled maintenance policy.
Expired cache rows are replaced on use but not automatically purged. Do not
delete usage newer than 24 hours, or you reset active limits.

## Destination delivery and image rights

Typing suggestions and destination details now use the verified-user
`safar-destinations` Edge Function. Public-provider results are cached server-side
for 24h (partial responses 5 minutes). Device-to-Wikipedia multi-request chains
have been removed. This removes a client-side failure point; the exact original
Android failure cannot be established without device/network logs.

Wikimedia images require creator, source and license metadata and show those
credits. Wikipedia/Wikivoyage excerpts link to their sources under CC BY-SA.
Coordinates and available bounds distinguish namesakes; nearby entries are
filtered for attraction relevance. Regional discovery is still a 10 km lookup
around the selected center, **not exhaustive state/country-wide coverage**.
The generated scenic fallback and legacy Unsplash URLs are no longer used by
screen code. Six real Wikimedia photos are bundled with attribution/license
metadata in `assets/photography/`; the Home hero cycles five of them every seven seconds.
Missing exact-location coverage uses a neutral placeholder. Trip cards/workspaces
resolve credited photos for display without rewriting stored cover fields.
The PDF preview uses the same photo presentation; the printed PDF remains a
text-based itinerary. The user-supplied logo is wired into in-app/native branding;
review icon masking on devices and produce an opaque iOS store icon before release.

Photon's public demo is for limited testing, not a production SLA. Configure
`PHOTON_BASE_URL` as a developer-owned compatible service in Edge secrets.
Explicit Enter/activity search still uses the legacy Nominatim-compatible client
service. Its per-device spacing is NOT a global limit; replace it with a compliant
hosted gateway before public launch. See the
[Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/).
Google Places is not enabled; the user chose Wikimedia until a Google key is ready.

## Completed verification

- TypeScript: pass; Expo lint: pass, no warnings.
- Node automated tests: 14/14.
- Deno check: both Edge Functions pass.
- Expo Doctor: 21/21.
- Android production JavaScript export and web static export (19 routes): pass.
- Live provider smoke: Hyderabad India/Pakistan distinguished, credited photograph,
  six local places, Wikivoyage seasonal guidance.
- Live SQL core regression: profile and workspace CRUD, repeated trip creation,
  AI preview/approval/idempotence and outsider rejection.
- Live four-account SQL regression: owner/editor/viewer/outsider, email-bound
  invitation, revocation, locale defaults, service-only permissions, request/unit limits.
- Live Auth: email enabled, autoconfirm false, phone/anonymous false.

These are SQL-claim tests, not real email sign-ins or an authenticated Edge/Groq
end-to-end test. The browser skill could not establish its connection, so browser
screenshots and visual regression remain unverified. No APK/AAB was built or installed.

## Blockers and unfinished work

1. Test the signed-in Edge path on Android: autocomplete, photos under slow/failed
   networks, AI follow-ups, quotas, invalid output, cancellation, approval, resume.
   Never disable JWT or RLS to resolve a failing test.
2. Complete two real-account collaboration/email/recovery tests and verify
   custom SMTP/deliverability, allowed redirects, production domain and support contact.
3. Account deletion currently removes database account/trip rows through the
   existing RPC, but full Storage blob cleanup is not implemented. Supabase may
   reject deletion when the account owns Storage objects. Replaced avatars and
   deleted-trip blobs need lifecycle cleanup. This is a public-release blocker.
4. JSON data export is available in Profile → Privacy & security. It includes
   accessible shared records and photo metadata, not original photos. It is paged,
   capped at 10,000 rows/table, and not a transactional snapshot during concurrent edits.
5. Publish reviewed HTTPS Privacy/Terms pages and set the two public legal URLs.
   Review data retention, deletion, processor disclosures, licenses and Play Data Safety.
6. 32 npm audit findings (12 moderate, 20 high); no forced SDK-breaking upgrades.
   [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
   is disabled. Six authenticated SECURITY DEFINER RPC warnings remain intentional
   but need independent security review; the new service-only RPC is not client-callable.
7. Physical Android QA: keyboard, date selection, image picker/uploads, nested
   modals, OSM map gestures, JSON/PDF sharing, Android back and small-screen layout.
   Rebuild native development clients for the new `expo-localization` module.
8. Exact visual parity, accessible screen-reader traversal, worldwide guide coverage,
   licensed cover imagery everywhere, all requested AI preview editing,
   atomic collaborative activity reorder, true AI replacement/removal actions,
   notifications, translations and full offline sync remain unfinished.
9. The floating gear is not a Safar component. Compare Expo Go and release builds
   and inspect Android accessibility controls; its origin is not confirmed here.

Home keeps the prior explicitly requested compact My Trips / Join Trip / Safar AI
quick actions. The newer master list included removed shortcuts again; those
features remain available through tabs/workspaces without re-cluttering Home.

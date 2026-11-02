// Expo Router native intent handler.
// This file intercepts ALL incoming deep links on Android before Expo Router
// processes them. It normalises Supabase email-confirmation redirects so the
// app reliably opens the email-confirmed screen regardless of which variant of
// the safarapp:// deep link Supabase sends.
//
// Supabase may deliver the post-verification redirect as:
//   safarapp://email-confirmed#access_token=...&type=signup
//   safarapp://email-confirmed?token_hash=...&type=signup
//   safarapp://email-confirmed?code=...
//   safarapp://email-confirmed?error=...
//   safarapp://email-confirmed (bare, no params — falls through to screen)
//
// We forward all of these unchanged so email-confirmed.tsx can parse them.
// For any other deep link we return the path as-is (Expo Router default).

export function redirectSystemPath(intent) {
  try {
    const {
      path
    } = intent;

    // Normalise both scheme variants Supabase might send.
    const normalised = path.replace(/^safarapp:\/\//, '/').replace(/^safar:\/\//, '/');

    // Strip the Expo Router /--/ prefix that the Expo dev client adds.
    const stripped = normalised.replace(/^\/--\//, '/');
    return stripped;
  } catch {
    return intent.path;
  }
}
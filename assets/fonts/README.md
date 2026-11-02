# Google Sans — Safar typography

The three unmodified static TTF files come from the official Google Fonts release:
https://github.com/googlefonts/googlesans/releases/tag/v14.000

Archive: `GoogleSans-v14.000.zip`, paths `build/GoogleSans/static/GoogleSans-{Regular,Medium,Bold}.ttf`.
The adjacent `OFL.txt` is copied from that repository's `v14.000` tag. Font files retain their embedded copyright and licensing records.

Embedded font copyright: Copyright 2025 The Google Sans Project Authors (github.com/googlefonts/googlesans). The tagged repository license also credits the Google Sans Flex Project Authors; both notices are preserved here and in the original files.

Regular (400) is used for body copy, Medium (500) for labels, and Bold (700) for headings and heavier existing styles (600–900). Static files are intentional: Safar remains on Expo SDK 57. All files are bundled locally and need no runtime font service or paid license key.

Loading uses `expo-font`; shared Text/TextInput components preserve refs, accessibility props, system text scaling and explicit monospace overrides. If font loading fails, the app uses system fonts instead of blocking access. Native system dialogs/maps and the separately generated PDF retain their platform/document fonts.

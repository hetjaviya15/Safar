// Expo Go supplies its own Maps key. Standalone Android builds need your
// restricted Maps SDK for Android key at build time (not a Groq/server key).
export default ({
  config
}) => ({
  ...config,
  name: config.name ?? 'Safar',
  slug: config.slug ?? 'safar',
  android: {
    ...config.android,
    softwareKeyboardLayoutMode: 'resize'
  },
  plugins: [...(config.plugins ?? []), 'expo-localization', ['react-native-maps', {
    ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? {
      androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY
    } : {})
  }]]
});
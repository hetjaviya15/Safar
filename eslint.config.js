// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "supabase/functions/**"],
    settings: {
      "import/resolver": {
        typescript: {
          project: "./jsconfig.json",
        },
      },
    },
    rules: {
      // Data loading in this app intentionally begins from route mount effects.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  }
]);

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'worker_plan_b.js', 'docs/*', 'scripts/cloudflare-worker/*', 'internal-docs/*', 'ai-companion-web/*'],
  },
]);

// lint-staged runs commands with staged file paths appended as arguments.
// For full-project checks (eslint + tsc, go lint) that must use their own
// config files, we return a plain string from a function so lint-staged
// runs the command exactly as written — no file paths appended.
module.exports = {
  'apps/web/**/*.{ts,tsx,js,jsx}': [
    'npx prettier --write',
    () => 'npm run lint:web',
  ],
  'apps/api/**/*.go': () => 'npm run lint:api',
};

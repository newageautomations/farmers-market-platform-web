// Vite and Astro default NODE_ENV to production before loading their config.
// Preserve an explicitly supplied value so a hosted build cannot use local env files.
Object.defineProperty(process, Symbol.for('market.frontendNodeEnvironment'), {
  value: process.env.NODE_ENV,
});

// Playwright creates these transient reporters even with screenshot/video/trace off.
// Suppress their writes for evidence-free runs without changing test execution.
/* eslint-disable @typescript-eslint/no-require-imports */
if (process.env.FRONTEND_NO_EVIDENCE === 'true') {
  const fs = require('node:fs');
  const path = require('node:path');
  const output = (file) =>
    /(?:^|[\\/])(?:test-results|playwright-report)(?:[\\/]|$)/.test(
      String(file),
    );
  for (const name of ['mkdir', 'rm', 'rmdir', 'unlink']) {
    const original = fs.promises[name]?.bind(fs.promises);
    if (original)
      fs.promises[name] = async (file, ...args) => {
        if (output(file)) return;
        return original(file, ...args);
      };
    const sync = fs[name + 'Sync']?.bind(fs);
    if (sync)
      fs[name + 'Sync'] = (file, ...args) => {
        if (output(file)) return;
        return sync(file, ...args);
      };
  }
  const write = fs.promises.writeFile.bind(fs.promises);
  fs.promises.writeFile = async (file, ...args) => {
    const name = path.basename(String(file));
    if (name === '.last-run.json' || name === 'error-context.md') return;
    return write(file, ...args);
  };
}

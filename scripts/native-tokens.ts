import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = readFileSync(resolve('packages/ui/src/styles.css'), 'utf8');
const names = {
  primary: 'brand-primary',
  background: 'brand-background',
  surface: 'brand-surface',
  foreground: 'brand-foreground',
  muted: 'brand-muted',
  warning: 'status-warning-fg',
  warningBackground: 'status-warning-bg',
};
export const nativeTokens = Object.fromEntries(
  Object.entries(names).map(([key, name]) => {
    const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1];
    if (!value) throw new Error(`Missing approved UI token ${name}`);
    return [key, value.trim()];
  }),
);
if (process.argv[1]?.endsWith('native-tokens.ts'))
  writeFileSync(
    resolve('mobile/companion/src/design-tokens.json'),
    JSON.stringify(nativeTokens, null, 2) + '\n',
  );

import { readFileSync } from 'node:fs';

export function readFrontendBuild(path: string | URL): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('Frontend build configuration is missing or invalid');
  }
}

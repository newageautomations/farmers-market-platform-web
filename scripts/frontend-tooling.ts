import { loadEnv } from 'vite';
import { requiresInjectedEnvironment } from '@market/config';

export function frontendToolingEnvironment(mode: string, building: boolean) {
  const initialNodeEnv = Object.getOwnPropertyDescriptor(
    process,
    Symbol.for('market.frontendNodeEnvironment'),
  );
  const injected = { ...process.env };
  if (building && initialNodeEnv && initialNodeEnv.value === undefined)
    delete injected.NODE_ENV;

  if (requiresInjectedEnvironment(injected))
    return { environment: injected, envDir: false as const };

  const envDir = '../..';
  const environment: Record<string, string | undefined> = {
    ...loadEnv(mode, envDir, ''),
    ...injected,
    NODE_ENV: injected.NODE_ENV,
  };
  if (requiresInjectedEnvironment(environment))
    throw new Error(
      'Hardened frontend settings must be supplied in the process environment',
    );
  return { environment, envDir };
}

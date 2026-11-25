// Keep this contract in sync with src/deployment-environment.ts in the API repository.
type Environment = Record<string, string | undefined>;
type AppMode = 'dev' | 'test' | 'production';
export type DeploymentEnvironment =
  'development' | 'test' | 'local-qualification' | 'staging' | 'production';

export function requiresInjectedEnvironment(env: Environment) {
  return (
    env.APP_ENV === 'production' ||
    env.NODE_ENV === 'production' ||
    (env.DEPLOYMENT_ENV !== undefined &&
      env.DEPLOYMENT_ENV !== 'development' &&
      env.DEPLOYMENT_ENV !== 'test')
  );
}

export function deploymentEnvironment(
  env: Environment,
  defaultApp?: 'dev' | 'test',
): { mode: AppMode; deployment: DeploymentEnvironment } {
  const mode = env.APP_ENV ?? defaultApp;
  if (mode !== 'dev' && mode !== 'test' && mode !== 'production')
    throw new Error('APP_ENV_EXPLICIT_MODE_REQUIRED');
  if (mode === 'production') {
    if (env.NODE_ENV !== 'production')
      throw new Error('NODE_ENV_PRODUCTION_REQUIRED');
    const deployment = env.DEPLOYMENT_ENV;
    if (
      deployment !== 'staging' &&
      deployment !== 'production' &&
      deployment !== 'local-qualification'
    )
      throw new Error('DEPLOYMENT_ENV_HARDENED_IDENTITY_REQUIRED');
    return { mode, deployment };
  }
  const deployment = mode === 'dev' ? 'development' : 'test';
  if (
    env.NODE_ENV === 'production' ||
    (env.DEPLOYMENT_ENV !== undefined && env.DEPLOYMENT_ENV !== deployment)
  )
    throw new Error('DEPLOYMENT_ENV_LOCAL_MODE_MISMATCH');
  return { mode, deployment };
}

export function isLoopbackHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'localhost.localdomain' ||
    host === '[::1]' ||
    host === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(host)
  );
}

export function validateDeploymentHost(
  hostname: string,
  deployment: DeploymentEnvironment,
  name: string,
) {
  if (deployment === 'local-qualification' && !isLoopbackHost(hostname))
    throw new Error(`${name}_LOOPBACK_REQUIRED`);
  if (
    (deployment === 'staging' || deployment === 'production') &&
    (isLoopbackHost(hostname) ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i.test(
        hostname,
      ) ||
      /\.(?:local|localdomain|internal)$/i.test(hostname))
  )
    throw new Error(`${name}_PUBLIC_HOST_REQUIRED`);
}

export function validateStagingAdmission(
  env: Environment,
  deployment: DeploymentEnvironment,
) {
  const testers = env.STAGING_TESTER_ACCESS ?? 'closed';
  const storefronts = env.STAGING_ANONYMOUS_STOREFRONTS ?? 'disabled';
  if (testers === 'closed' && storefronts === 'disabled') return false;
  if (
    deployment === 'staging' &&
    testers === 'provisioned' &&
    storefronts === 'published'
  )
    return true;
  throw new Error('STAGING_ADMISSION_NOT_QUALIFIED');
}

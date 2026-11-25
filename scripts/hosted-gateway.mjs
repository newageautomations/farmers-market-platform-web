import { get } from 'node:http';

const env = process.env;
const port = Number(env.GATEWAY_PORT ?? 8080);
const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const services = ['ADMIN', 'STOREFRONT', 'API'];

function validate() {
  if (!['access', 'application'].includes(env.STAGING_INGRESS_MODE ?? 'access'))
    throw new Error('STAGING_INGRESS_MODE must be access or application');
  const hosts = [
    env.MARKET_ADMIN_HOST,
    env.MARKET_ACCOUNT_HOST,
    env.MARKET_API_HOST,
    ...(env.STOREFRONT_PILOT_HOSTS ?? '').split(' '),
  ];
  const parent = env.MARKET_ADMIN_HOST?.split('.').slice(1).join('.');
  if (
    env.DEPLOYMENT_ENV !== 'staging' ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    (env.GATEWAY_PORT !== undefined && String(port) !== env.GATEWAY_PORT) ||
    hosts.some(
      (host) =>
        !host ||
        host.length > 253 ||
        !parent?.includes('.') ||
        !host.split('.').every((label) => dnsLabel.test(label)) ||
        host.split('.').slice(1).join('.') !== parent,
    ) ||
    new Set(hosts).size !== hosts.length
  ) {
    throw new Error('Check gateway stage, loopback port, and exact hostnames');
  }
  const keys = services.map((service) => env[`MARKET_${service}_INGRESS_KEY`]);
  if (
    keys.some(
      (key) => !/^[a-f0-9]{64}$/.test(key ?? '') || new Set(key).size < 12,
    ) ||
    new Set(keys).size !== keys.length ||
    !env.TUNNEL_TOKEN?.trim()
  ) {
    throw new Error('Check gateway ingress keys and named Tunnel credential');
  }
  for (const service of services) {
    const value = env[`MARKET_${service}_UPSTREAM`];
    const url = value && URL.parse(value);
    if (
      !url ||
      url.origin !== value ||
      url.protocol !== 'http:' ||
      !/^([a-z0-9-]+)\.railway\.internal$/.test(url.hostname) ||
      !dnsLabel.test(url.hostname.split('.')[0]) ||
      !url.port
    ) {
      throw new Error(`Check the private HTTP origin for ${service}`);
    }
  }
}

function probe() {
  const request = get(
    {
      host: '127.0.0.1',
      port,
      path: '/health/ready',
      headers: { Host: 'healthcheck.railway.app' },
      timeout: 2000,
    },
    (response) => {
      response.resume();
      if (response.statusCode !== 200) process.exitCode = 1;
    },
  );
  request.on('timeout', () => request.destroy(new Error('Probe timed out')));
  request.on('error', () => {
    process.exitCode = 1;
  });
}

if (process.argv[2] === 'probe') {
  probe();
} else {
  try {
    validate();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

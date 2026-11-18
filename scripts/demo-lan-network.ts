import { networkInterfaces } from 'node:os';

export function isPrivateIPv4(address: string) {
  const parts = address.split('.');
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)
  )
    return false;
  const [a, b] = parts.map(Number);
  return (
    a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168)
  );
}

export function demoLanAddress(configured?: string) {
  const interfaces = Object.entries(networkInterfaces());
  const addresses = interfaces.flatMap(([name, entries]) =>
    (entries ?? [])
      .filter(
        (entry) =>
          entry.family === 'IPv4' &&
          !entry.internal &&
          isPrivateIPv4(entry.address),
      )
      .map((entry) => ({ name, address: entry.address })),
  );
  if (configured) {
    if (!addresses.some((entry) => entry.address === configured))
      throw new Error(
        'DEMO_LAN_IP must be a private IPv4 address assigned to this computer.',
      );
    return configured;
  }
  return addresses.find(
    (entry) =>
      !/vethernet|virtual|vmware|docker|wsl|vpn|loopback|tailscale/i.test(
        entry.name,
      ),
  )?.address;
}

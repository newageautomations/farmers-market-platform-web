// Dedicated local composition only. No runtime production bypass or provider transport is configured.
'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
const dns = require('node:dns');
const original = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    queueMicrotask(() =>
      options?.all
        ? callback(null, [{ address: '127.0.0.1', family: 4 }])
        : callback(null, '127.0.0.1', 4),
    );
    return;
  }
  if (!['127.0.0.1', '127.0.0.2', '::1'].includes(hostname)) {
    queueMicrotask(() =>
      callback(
        Object.assign(new Error('Local composition blocks external network'), {
          code: 'ENETUNREACH',
        }),
      ),
    );
    return;
  }
  return original.call(this, hostname, options, callback);
};
const net = require('node:net');
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  const normalized = Array.isArray(first) ? first[0] : first;
  const host =
    typeof normalized === 'object'
      ? normalized.host
      : typeof args[1] === 'string'
        ? args[1]
        : undefined;
  if (
    host &&
    !['localhost', '127.0.0.1', '127.0.0.2', '::1'].includes(host) &&
    !host.endsWith('.localhost')
  )
    throw new Error('Local composition blocks external network');
  return connect.apply(this, args);
};
// Test-process diagnostics use the private parent IPC pipe, never a public app endpoint.
if (process.send && require('node:worker_threads').isMainThread)
  process.on('message', (message) => {
    if (message?.type !== 'phase13h-memory') return;
    global.gc?.();
    const { heapUsed, rss } = process.memoryUsage();
    process.send({ type: 'phase13h-memory', pid: process.pid, heapUsed, rss });
  });
// Diagnostics must not keep an invalid-startup process alive.
process.channel?.unref();

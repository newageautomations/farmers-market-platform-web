import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'graphql';
import { withRequestTimeout } from '../packages/api/src/request-timeout';
import { transport } from '../packages/api/src/transport';

const timeoutDescriptor = Object.getOwnPropertyDescriptor(
  AbortSignal,
  'timeout',
)!;
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(AbortSignal, 'timeout', {
    value: undefined,
    configurable: true,
  });
});
afterEach(() => {
  Object.defineProperty(AbortSignal, 'timeout', timeoutDescriptor);
  vi.useRealTimers();
});

describe('portable request deadlines in the web runtime without AbortSignal.timeout', () => {
  it('cleans up on success, failure and synchronous exceptions', async () => {
    expect(AbortSignal.timeout).toBeUndefined();
    const external = new AbortController();
    const remove = vi.spyOn(external.signal, 'removeEventListener');
    await expect(
      withRequestTimeout(50, async () => 'ok', external.signal),
    ).resolves.toBe('ok');
    await expect(
      withRequestTimeout(50, async () => {
        throw new Error('failed');
      }),
    ).rejects.toThrow('failed');
    await expect(
      withRequestTimeout(50, () => {
        throw new Error('sync');
      }),
    ).rejects.toThrow('sync');
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves browser cancellation reasons and never starts an already cancelled request', async () => {
    const external = new AbortController();
    const reason = new Error('Caller cancelled');
    let internal: AbortSignal | undefined;
    const work = vi.fn((signal: AbortSignal) => {
      internal = signal;
      return new Promise<never>(() => {});
    });
    const result = withRequestTimeout(50, work, external.signal);
    const rejected = expect(result).rejects.toBe(reason);
    external.abort(reason);
    await rejected;
    expect(internal?.aborted).toBe(true);
    await expect(withRequestTimeout(50, work, external.signal)).rejects.toBe(
      reason,
    );
    expect(work).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a body reader that ignores abort and does not abort the caller signal', async () => {
    const external = new AbortController();
    let internal: AbortSignal | undefined;
    const result = withRequestTimeout(
      50,
      (signal) => {
        internal = signal;
        return new Promise<never>(() => {});
      },
      external.signal,
    );
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expect(internal?.aborted).toBe(true);
    expect(external.signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains web cookie/channel semantics and the eight-second unavailable classification', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { me: null } })),
      );
    const run = transport('shop', {
      endpoint: 'https://api.example.invalid/shop-api',
      channelToken: 'channel',
      fetch: fetcher,
    });
    const operation = {
      api: 'shop' as const,
      document: parse('{ me { id } }'),
    };
    await expect(run(operation, {})).resolves.toEqual({ me: null });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'include',
      headers: { 'vendure-token': 'channel' },
    });
    fetcher.mockImplementation(() => new Promise(() => {}));
    const result = run(operation, {});
    const rejected = expect(result).rejects.toMatchObject({
      kind: 'unavailable',
    });
    await vi.advanceTimersByTimeAsync(7999);
    expect(fetcher.mock.calls[1]?.[1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(fetcher.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

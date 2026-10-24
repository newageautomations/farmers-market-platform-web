/** Uses only the AbortController contract available in React Native and browsers. */
export class RequestTimeoutError extends Error {
  constructor(message = 'The request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

function cancellationReason(signal: AbortSignal): unknown {
  // Older native signals have neither reason nor throwIfAborted().
  if ('reason' in signal && signal.reason !== undefined) return signal.reason;
  const error = new Error('The request was cancelled');
  error.name = 'AbortError';
  return error;
}

/** Keep body consumption inside work. Commit application state only after this resolves.
 * The race also bounds transports/body readers that ignore abort. It never retries work.
 */
export async function withRequestTimeout<T>(
  timeoutMs: number,
  work: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  if (externalSignal?.aborted) throw cancellationReason(externalSignal);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectInterruption: (reason: unknown) => void = () => {};
  let interrupted = false;
  const interruption = new Promise<never>((_resolve, reject) => {
    rejectInterruption = reject;
  });
  const interrupt = (reason: unknown) => {
    if (interrupted) return;
    interrupted = true;
    // Settle with our reason before native fetch rejects with a generic AbortError.
    rejectInterruption(reason);
    controller.abort();
  };
  const onAbort = () => interrupt(cancellationReason(externalSignal!));
  try {
    externalSignal?.addEventListener('abort', onAbort);
    timer = setTimeout(() => interrupt(new RequestTimeoutError()), timeoutMs);
    return await Promise.race([work(controller.signal), interruption]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

import { useEffect, useState } from 'react';
import {
  safeError,
  type MarketGenerationJobStatus,
  type AppError,
} from '@market/api';
import { Alert, Button, ErrorState } from '@market/ui';
import type { MarketService } from './service';

/** Active-page observation only: 2 seconds, at most 60 reads, with response/cleanup guards. */
export function MarketGenerationStatus({
  service,
  jobId,
  onCompleted,
}: {
  service: MarketService;
  jobId: string;
  onCompleted: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const key = `${service.readKey}:${jobId}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    data?: MarketGenerationJobStatus;
    error?: AppError;
    exhausted?: boolean;
  }>({ key: '' });
  useEffect(() => {
    let current = true,
      timer: ReturnType<typeof setTimeout> | undefined,
      reads = 0;
    async function poll() {
      try {
        const data = await service.generationStatus(jobId);
        if (!current) return;
        reads++;
        const terminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(
          data.status,
        );
        setResult({ key, data, exhausted: !terminal && reads >= 60 });
        if (data.status === 'COMPLETED') onCompleted();
        if (!terminal && reads < 60)
          timer = setTimeout(() => void poll(), 2000);
      } catch (error) {
        if (current) setResult({ key, error: safeError(error) });
      }
    }
    void poll();
    return () => {
      current = false;
      if (timer) clearTimeout(timer);
    };
  }, [service, jobId, key, onCompleted]);
  const active = result.key === key ? result : undefined;
  return (
    <div role="status" aria-live="polite">
      <p>Generation request {jobId} accepted.</p>
      {active?.error ? (
        <ErrorState error={active.error} />
      ) : (
        <Alert>
          Status: {active?.data?.status ?? 'PENDING'}.
          {active?.data?.status === 'COMPLETED' &&
            ' Worker completed. Occurrences were refreshed.'}
          {active?.data?.status === 'FAILED' &&
            ' Generation failed. Check the schedule before deliberately submitting another request.'}
          {active?.data?.matchedOccurrences != null &&
            ` ${active.data.matchedOccurrences} occurrences matched the generation request, including existing occurrences.`}
          {active?.exhausted &&
            ' Automatic observation reached its read limit. Check status again when ready.'}
        </Alert>
      )}
      {(active?.error || active?.exhausted) && (
        <Button className="secondary" onClick={() => setRevision((v) => v + 1)}>
          Check generation status
        </Button>
      )}
    </div>
  );
}

import {
  AppError,
  PosInputError,
  type InPersonApi,
  type PosCommand,
  type PosDraft,
} from '@market/api';

interface Job {
  key: string;
  input: PosCommand;
  version?: number;
}
/** One queue per selected vendor/cashier component. Uncertain writes retain the exact receipt key. */
export class PosCartQueue {
  jobs: Job[] = [];
  blocked = false;
  running = false;
  disposed = false;
  constructor(
    public draft: PosDraft,
    private api: InPersonApi,
    private changed: (draft: PosDraft, pending: number, error?: Error) => void,
  ) {}
  dispose() {
    this.disposed = true;
    this.jobs = [];
  }
  enqueue(input: PosCommand) {
    if (this.disposed || this.blocked) return;
    this.jobs.push({ key: crypto.randomUUID(), input });
    this.changed(this.draft, this.jobs.length);
    void this.flush();
  }
  retry() {
    this.blocked = false;
    void this.flush();
  }
  quantities() {
    const values = new Map(
      this.draft.items.map((line) => [line.variantId, line.quantity]),
    );
    for (const { input } of this.jobs) {
      if (input.action === 'add' || input.action === 'delta')
        values.set(
          input.variantId,
          Math.max(0, (values.get(input.variantId) ?? 0) + input.quantity),
        );
      else if (input.action === 'quantity')
        values.set(input.variantId, input.quantity);
    }
    return values;
  }
  private async flush() {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (this.jobs.length && !this.blocked && !this.disposed) {
        const job = this.jobs[0]!;
        job.version ??= this.draft.version;
        try {
          const next = await this.api.command(
            this.draft.id,
            job.version,
            job.key,
            job.input,
          );
          if (this.disposed) return;
          this.draft = next;
          this.jobs.shift();
          this.changed(next, this.jobs.length);
        } catch (error) {
          if (this.disposed) return;
          if (error instanceof PosInputError) {
            const unsaved = this.jobs.length - 1;
            this.jobs = [];
            this.changed(
              this.draft,
              0,
              unsaved > 0
                ? new PosInputError(
                    `${error.message} ${unsaved} later queued changes were not saved. Reload the cart and retry them.`,
                  )
                : error,
            );
          } else {
            this.blocked = true;
            this.changed(
              this.draft,
              this.jobs.length,
              error instanceof AppError ? error : new AppError('network'),
            );
          }
        }
      }
    } finally {
      this.running = false;
    }
  }
}

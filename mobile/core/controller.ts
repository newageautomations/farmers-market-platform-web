import type {
  NativeCheckout,
  NativeLaunch,
  NativeSessionProof,
} from '../../packages/api/src/native-mobile';

export type ReaderState =
  | 'SDK_UNAVAILABLE'
  | 'MERCHANT_NOT_AUTHORIZED'
  | 'READER_NOT_CONNECTED'
  | 'SANDBOX_MOCK_READER'
  | 'REAL_READER_CONNECTED';
export interface NativeReaderPort {
  authorize(checkout: NativeLaunch): Promise<void>;
  status(): Promise<ReaderState>;
  settings(): Promise<void>;
  mockReader(): Promise<void>;
  pay(checkout: NativeLaunch): Promise<void>;
  cancel(): Promise<void>;
  deauthorize(): Promise<void>;
}
export interface CompanionApi {
  action<T>(
    action: string,
    proof: NativeSessionProof,
    handoffId?: string,
  ): Promise<T>;
}
export interface PendingStore {
  read(): Promise<string | null>;
  write(id: string): Promise<void>;
  clear(): Promise<void>;
}
/** Lifecycle authority shared by the native renderer and credential-free tests. */
export class CompanionController {
  checkout: NativeCheckout | null = null;
  private running = false;
  constructor(
    private readonly api: CompanionApi,
    private readonly proof: NativeSessionProof,
    private readonly readers: Record<
      NativeCheckout['method'],
      NativeReaderPort
    >,
    private readonly pending: PendingStore,
  ) {}
  private async exclusive<T>(work: () => Promise<T>) {
    if (this.running)
      throw new Error('A native operation is already in progress');
    this.running = true;
    try {
      return await work();
    } finally {
      this.running = false;
    }
  }
  async open(handoffId: string) {
    return this.exclusive(async () => {
      if (
        this.checkout &&
        this.checkout.handoffId !== handoffId &&
        !['COMPLETED', 'DECLINED', 'CANCELLED', 'FAILED'].includes(
          this.checkout.sale.state,
        )
      )
        throw new Error(
          'Recover the current payment before opening another checkout',
        );
      this.checkout = await this.api.action<NativeCheckout>(
        'claim',
        this.proof,
        handoffId,
      );
      // Persist the locator before requesting launch permission or touching the SDK.
      await this.pending.write(handoffId);
      return this.checkout;
    });
  }
  async recover() {
    return this.exclusive(async () => {
      const id = this.checkout?.handoffId ?? (await this.pending.read());
      if (!id) return null;
      this.checkout = await this.api.action<NativeCheckout>(
        'reconcile',
        this.proof,
        id,
      );
      return this.checkout;
    });
  }
  async authorizeReader() {
    return this.exclusive(async () => {
      if (!this.checkout) throw new Error('Open a checkout first');
      if (this.checkout.readerQualification === 'CONTROLLED_TEST')
        throw new Error(
          'Controlled adapter fixtures cannot authorize a real native SDK',
        );
      const c = await this.api.action<NativeLaunch>(
        'credentials',
        this.proof,
        this.checkout.handoffId,
      );
      await this.readers[c.method].authorize(c);
      return this.readers[c.method].status();
    });
  }
  async pay() {
    return this.exclusive(async () => {
      if (
        !this.checkout ||
        this.checkout.readerQualification === 'CONTROLLED_TEST'
      )
        throw new Error('Native SDK checkout is unavailable for this fixture');
      const reader = this.readers[this.checkout.method],
        status = await reader.status();
      if (!['REAL_READER_CONNECTED', 'SANDBOX_MOCK_READER'].includes(status))
        throw new Error('Connect an authorized reader first');
      const launch = await this.api.action<NativeLaunch>(
        'launch',
        this.proof,
        this.checkout.handoffId,
      );
      this.checkout = { ...launch, canStart: false };
      if (!launch.canStart) return this.checkout;
      // Any SDK completion, cancellation or exception triggers independent retrieval only.
      // No callback fields enter the financial API and no failure triggers another launch.
      try {
        await reader.pay(launch);
      } catch {
        /* uncertainty is shown from backend state */
      }
      this.checkout = await this.api.action<NativeCheckout>(
        'reconcile',
        this.proof,
        launch.handoffId,
      );
      return this.checkout;
    });
  }
  async cancel() {
    if (!this.checkout) return null;
    // May run while the native prompt is active; server cancellation never infers non-capture.
    const c = this.checkout;
    try {
      await this.readers[c.method].cancel();
    } finally {
      this.checkout = await this.api.action<NativeCheckout>(
        'cancel',
        this.proof,
        c.handoffId,
      );
    }
    return this.checkout;
  }
  async logout() {
    // Native cleanup occurs even if the platform is unreachable. The pending locator survives.
    try {
      await Promise.all(
        Object.values(this.readers).map((r) => r.deauthorize()),
      );
    } finally {
      await this.api.action('revoke', this.proof);
      this.checkout = null;
    }
  }
}

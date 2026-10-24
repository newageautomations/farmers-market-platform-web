import { requireOptionalNativeModule } from 'expo';
import type { NativeLaunch } from '../../../packages/api/src/native-mobile';
import type { NativeReaderPort, ReaderState } from '../../core/controller';

interface CloverGoBoundary {
  status(): Promise<{ available: boolean; reason: string }>;
  cleanup(): Promise<void>;
}
/** A real native availability boundary. No fabricated Clover Go SDK calls or secrets. */
export class CloverGoNativeReader implements NativeReaderPort {
  private module =
    requireOptionalNativeModule<CloverGoBoundary>('MarketCloverGo');
  async status(): Promise<ReaderState> {
    await this.module?.status();
    return 'SDK_UNAVAILABLE';
  }
  async authorize(_c: NativeLaunch): Promise<void> {
    throw new Error(
      'Clover Go requires developer-issued API credentials and an approved native authorization model',
    );
  }
  async settings(): Promise<void> {
    throw new Error('Clover Go SDK reader discovery is unavailable');
  }
  async mockReader(): Promise<void> {
    throw new Error(
      'Clover Go has no qualified hardware-free reader in this application',
    );
  }
  async pay(_c: NativeLaunch): Promise<void> {
    throw new Error('Clover Go native execution is unavailable');
  }
  async cancel() {
    await this.module?.cleanup();
  }
  async deauthorize() {
    await this.module?.cleanup();
  }
}

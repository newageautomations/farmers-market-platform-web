import { Platform, PermissionsAndroid } from 'react-native';
import * as sdk from 'mobile-payments-sdk-react-native';
import type { NativeLaunch } from '../../../packages/api/src/native-mobile';
import type { NativeReaderPort, ReaderState } from '../../core/controller';
import { squarePaymentTerms } from '../../core/square-request';

export function squareRequest(c: NativeLaunch): sdk.PaymentParameters {
  return {
    ...squarePaymentTerms(c),
    amountMoney: { amount: c.sale.amount, currencyCode: sdk.CurrencyCode.USD },
    processingMode: sdk.ProcessingMode.ONLINE_ONLY,
    appFeeMoney: { amount: 0, currencyCode: sdk.CurrencyCode.USD },
    tipMoney: { amount: 0, currencyCode: sdk.CurrencyCode.USD },
  };
}
export class SquareNativeReader implements NativeReaderPort {
  private authorized = false;
  constructor(
    private readonly applicationId: string,
    private readonly sandboxDebug: boolean,
  ) {}
  async authorize(c: NativeLaunch) {
    await this.deauthorize();
    if (
      c.readerQualification === 'CONTROLLED_TEST' ||
      !c.credentials ||
      c.credentials.applicationId !== this.applicationId ||
      c.merchant.environment !== 'Sandbox' ||
      !this.applicationId.startsWith('sandbox-')
    )
      throw new Error(
        'Square Sandbox native configuration does not match this merchant',
      );
    if (Platform.OS === 'android') {
      const permissions =
        Platform.Version >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]
          : [
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ];
      const result = await PermissionsAndroid.requestMultiple(permissions);
      if (
        Object.values(result).some(
          (s) => s !== PermissionsAndroid.RESULTS.GRANTED,
        )
      )
        throw new Error('Grant native reader permissions in device settings');
    }
    if (String(await sdk.getEnvironment()) !== sdk.Environment.SANDBOX)
      throw new Error('Square native SDK environment mismatch');
    await sdk.authorize(c.credentials.accessToken, c.credentials.locationId);
    const location = await sdk.getAuthorizedLocation();
    this.authorized = String(location.id) === c.merchant.locationId;
    if (!this.authorized) {
      await this.deauthorize();
      throw new Error('Authorized Square location mismatch');
    }
  }
  async status(): Promise<ReaderState> {
    if (
      !this.authorized ||
      String(await sdk.getAuthorizationState()) !==
        sdk.AuthorizationState.AUTHORIZED
    )
      return 'MERCHANT_NOT_AUTHORIZED';
    const readers = await sdk.getReaders();
    if (
      !readers.some(
        (r) =>
          r.status.status === sdk.ReaderInternalStatus.READY &&
          r.model !== sdk.ReaderModel.TAP_TO_PAY,
      )
    )
      return 'READER_NOT_CONNECTED';
    return String(await sdk.getEnvironment()) === sdk.Environment.SANDBOX
      ? 'SANDBOX_MOCK_READER'
      : 'REAL_READER_CONNECTED';
  }
  async settings() {
    if (!this.authorized) throw new Error('Authorize the merchant first');
    await sdk.showSettings();
  }
  async mockReader() {
    if (
      !this.sandboxDebug ||
      !this.authorized ||
      String(await sdk.getEnvironment()) !== sdk.Environment.SANDBOX
    )
      throw new Error(
        'Mock Reader requires an authorized native Sandbox debug build',
      );
    await sdk.showMockReaderUI();
  }
  async pay(c: NativeLaunch) {
    const status = await this.status();
    if (
      !c.canStart ||
      !['REAL_READER_CONNECTED', 'SANDBOX_MOCK_READER'].includes(status)
    )
      throw new Error(
        'A fresh backend launch permission and connected reader are required',
      );
    await sdk.startPayment(squareRequest(c), {
      additionalMethods: [],
      mode: sdk.PromptMode.DEFAULT,
    });
  }
  async cancel() {
    await sdk.cancelPayment();
  }
  async deauthorize() {
    this.authorized = false;
    try {
      await sdk.stopPairing();
    } catch {}
    try {
      await sdk.hideMockReaderUI();
    } catch {}
    await sdk.deauthorize();
  }
  async tapToPayCapability() {
    return {
      supported:
        Platform.OS === 'ios'
          ? Boolean(await sdk.TapToPaySettings.isDeviceCapable())
          : null,
      paymentEnabled: false,
      reason: 'Stage F device and entitlement qualification required',
    };
  }
  observe(onChange: () => void) {
    const stopReaders = sdk.setReaderChangedCallback(onChange);
    sdk.observeAuthorizationChanges((state) => {
      this.authorized = state === sdk.AuthorizationState.AUTHORIZED;
      onChange();
    });
    return () => {
      stopReaders();
      sdk.stopObservingAuthorizationChanges();
    };
  }
}

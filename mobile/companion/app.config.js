module.exports = () => ({
  name: 'Market payment companion',
  slug: 'market-payment-companion',
  version: '0.1.0',
  scheme: 'market-pos',
  orientation: 'default',
  ios: {
    bundleIdentifier: 'com.market.pos.companion',
    infoPlist: {
      NSBluetoothAlwaysUsageDescription: 'Connect an authorized payment reader',
      NSLocationWhenInUseUsageDescription:
        'Verify location for card-present payment processing',
      NSMicrophoneUsageDescription: 'Communicate with supported Square readers',
    },
  },
  android: {
    package: 'com.market.pos.companion',
    permissions: [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_SCAN',
      'ACCESS_FINE_LOCATION',
      'RECORD_AUDIO',
    ],
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 28,
          kotlinVersion: '2.3.0',
          extraMavenRepos: ['https://sdk.squareup.com/public/android/'],
        },
        ios: { deploymentTarget: '16.0' },
      },
    ],
    './plugins/with-square',
  ],
  extra: {
    environment: 'Sandbox',
    squareApplicationId: process.env.SQUARE_MOBILE_APPLICATION_ID ?? '',
    platformEndpoint:
      process.env.MOBILE_PLATFORM_ENDPOINT ?? 'http://10.0.2.2:3549/admin-api',
    dashboardOrigin:
      process.env.MOBILE_DASHBOARD_ORIGIN ?? 'http://localhost:4592',
  },
});

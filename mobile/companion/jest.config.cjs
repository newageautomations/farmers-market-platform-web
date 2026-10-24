module.exports = {
  preset: 'react-native',
  testMatch: ['<rootDir>/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native/.*)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/.stage-e-bundle/',
  ],
  collectCoverage: false,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
};

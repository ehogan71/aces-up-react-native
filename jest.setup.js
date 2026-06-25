/* eslint-env jest, node */
import '@testing-library/jest-native/extend-expect';

global.IS_REACT_ACT_ENVIRONMENT = true;

const ignoredConsoleErrorMessages = [
  'overlapping act() calls',
  'not configured to support act',
];

const originalConsoleError = console.error;
console.error = (...args) => {
  const message = String(args[0] ?? '');
  if (ignoredConsoleErrorMessages.some(ignored => message.includes(ignored))) {
    return;
  }

  originalConsoleError(...args);
};

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};

  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (key, value) => {
        store[key] = value;
      }),
      getItem: jest.fn(async key => store[key] ?? null),
      removeItem: jest.fn(async key => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async keys =>
        keys.map(key => [key, store[key] ?? null]),
      ),
      multiSet: jest.fn(async entries => {
        entries.forEach(([key, value]) => {
          store[key] = value;
        });
      }),
      multiRemove: jest.fn(async keys => {
        keys.forEach(key => {
          delete store[key];
        });
      }),
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

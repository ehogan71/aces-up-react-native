import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  saveAppSettings,
} from '../utils/appSettings';

// Unit tests for app-settings persistence and normalization behavior.
describe('appSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('returns defaults when storage read fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValue(new Error('AsyncStorageError'));

    await expect(getAppSettings()).resolves.toEqual(DEFAULT_APP_SETTINGS);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('normalizes stored settings values', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(
      JSON.stringify({
        showPlayableIndicators: false,
        showStackCounts: false,
        cardBackStyle: 'Green',
      }),
    );

    await expect(getAppSettings()).resolves.toEqual({
      showPlayableIndicators: false,
      showStackCounts: false,
      cardBackStyle: 'Red',
    });
  });

  it('uses defaults for missing booleans and keeps valid card back style', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(
      JSON.stringify({
        cardBackStyle: 'Blue',
      }),
    );

    await expect(getAppSettings()).resolves.toEqual({
      showPlayableIndicators: true,
      showStackCounts: true,
      cardBackStyle: 'Blue',
    });
  });

  it('falls back to defaults for malformed stored values', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue('"unexpected"');

    await expect(getAppSettings()).resolves.toEqual(DEFAULT_APP_SETTINGS);
  });

  it('saves settings to storage', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    await saveAppSettings({
      showPlayableIndicators: false,
      showStackCounts: true,
      cardBackStyle: 'Blue',
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      'aces-up-app-settings',
      JSON.stringify({
        showPlayableIndicators: false,
        showStackCounts: true,
        cardBackStyle: 'Blue',
      }),
    );
  });

  it('ignores storage failures when saving', async () => {
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValue(new Error('AsyncStorageError'));

    await expect(
      saveAppSettings({
        showPlayableIndicators: true,
        showStackCounts: false,
        cardBackStyle: 'Red',
      }),
    ).resolves.toBeUndefined();
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGameStats,
  incrementGamesFinished,
  incrementGamesStarted,
  incrementGamesWon,
  resetGameStats,
} from '../utils/gameStats';

// Unit tests for stats storage helpers, including failure and fallback paths.
describe('gameStats', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('returns zeroed stats if AsyncStorage read fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValue(new Error('AsyncStorageError'));

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('returns zeroed stats for malformed stored values', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue('42');

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });
  });

  it('returns zeroed stats when stored JSON cannot be parsed', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue('{');

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('normalizes partial stored stats', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockResolvedValue(JSON.stringify({ gamesStarted: 4, gamesWon: 2 }));

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 4,
      gamesFinished: 0,
      gamesWon: 2,
    });
  });

  it('returns zeroed stats for invalid error shapes', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue('boom');

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('persists increment and reset helpers', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    await expect(incrementGamesStarted()).resolves.toEqual({
      gamesStarted: 1,
      gamesFinished: 0,
      gamesWon: 0,
    });

    await expect(incrementGamesFinished()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 1,
      gamesWon: 0,
    });

    await expect(incrementGamesWon()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 1,
    });

    await expect(resetGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });

    expect(setItemSpy).toHaveBeenCalled();
  });

  it('keeps increment helpers from throwing if AsyncStorage fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValue(new Error('AsyncStorageError'));
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValue(new Error('AsyncStorageError'));

    await expect(incrementGamesStarted()).resolves.toEqual({
      gamesStarted: 1,
      gamesFinished: 0,
      gamesWon: 0,
    });
    await expect(incrementGamesFinished()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 1,
      gamesWon: 0,
    });
    await expect(incrementGamesWon()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 1,
    });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('disables further storage access silently when AsyncStorage native module is unavailable', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nativeModuleError = new Error(
      'AsyncStorageError: Native module is null, cannot access legacy storage',
    );

    const getItemSpy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValue(nativeModuleError);
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');

    await expect(getGameStats()).resolves.toEqual({
      gamesStarted: 0,
      gamesFinished: 0,
      gamesWon: 0,
    });

    getItemSpy.mockClear();
    setItemSpy.mockClear();

    await expect(incrementGamesStarted()).resolves.toEqual({
      gamesStarted: 1,
      gamesFinished: 0,
      gamesWon: 0,
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

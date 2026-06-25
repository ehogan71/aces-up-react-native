import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_STATS_STORAGE_KEY = 'aces-up-game-stats';

export type GameStats = {
  gamesStarted: number;
  gamesFinished: number;
  gamesWon: number;
};

const DEFAULT_GAME_STATS: GameStats = {
  gamesStarted: 0,
  gamesFinished: 0,
  gamesWon: 0,
};

let statsUpdateQueue: Promise<unknown> = Promise.resolve();
let storageDisabled = false;

const isStorageUnavailableError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return /Native module is null|cannot access legacy storage/i.test(
    error.message,
  );
};

const logStorageWarning = (operation: string, error: unknown) => {
  if (isStorageUnavailableError(error)) {
    storageDisabled = true;
    return;
  }

  console.warn(`Game stats storage failed during ${operation}.`, error);
};

const normalizeGameStats = (value: unknown): GameStats => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_GAME_STATS;
  }

  const candidate = value as Partial<GameStats>;
  return {
    gamesStarted: candidate.gamesStarted ?? 0,
    gamesFinished: candidate.gamesFinished ?? 0,
    gamesWon: candidate.gamesWon ?? 0,
  };
};

export const getGameStats = async (): Promise<GameStats> => {
  if (storageDisabled) {
    return DEFAULT_GAME_STATS;
  }

  let storedValue: string | null = null;

  try {
    storedValue = await AsyncStorage.getItem(GAME_STATS_STORAGE_KEY);
  } catch (error) {
    logStorageWarning('getItem', error);
    return DEFAULT_GAME_STATS;
  }

  if (!storedValue) {
    return DEFAULT_GAME_STATS;
  }

  try {
    return normalizeGameStats(JSON.parse(storedValue));
  } catch (error) {
    logStorageWarning('parse', error);
    return DEFAULT_GAME_STATS;
  }
};

const setGameStats = async (stats: GameStats) => {
  if (storageDisabled) {
    return;
  }

  try {
    await AsyncStorage.setItem(GAME_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    logStorageWarning('setItem', error);
  }
};

const updateGameStats = async (
  updater: (stats: GameStats) => GameStats,
): Promise<GameStats> => {
  const operation = statsUpdateQueue.then(async () => {
    const currentStats = await getGameStats();
    const nextStats = updater(currentStats);
    await setGameStats(nextStats);
    return nextStats;
  });

  statsUpdateQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation.catch(error => {
    logStorageWarning('update', error);
    return DEFAULT_GAME_STATS;
  });
};

export const incrementGamesStarted = () =>
  updateGameStats(stats => ({
    ...stats,
    gamesStarted: stats.gamesStarted + 1,
  }));

export const incrementGamesFinished = () =>
  updateGameStats(stats => ({
    ...stats,
    gamesFinished: stats.gamesFinished + 1,
  }));

export const incrementGamesWon = () =>
  updateGameStats(stats => ({
    ...stats,
    gamesWon: stats.gamesWon + 1,
  }));

export const resetGameStats = () =>
  updateGameStats(() => ({
    ...DEFAULT_GAME_STATS,
  }));

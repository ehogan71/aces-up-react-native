import AsyncStorage from '@react-native-async-storage/async-storage';

export type BackStyle = 'Red' | 'Blue';

export type AppSettings = {
  showPlayableIndicators: boolean;
  showStackCounts: boolean;
  cardBackStyle: BackStyle;
};

const APP_SETTINGS_STORAGE_KEY = 'aces-up-app-settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showPlayableIndicators: true,
  showStackCounts: true,
  cardBackStyle: 'Red',
};

const isBackStyle = (value: unknown): value is BackStyle =>
  value === 'Red' || value === 'Blue';

const normalizeAppSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_APP_SETTINGS;
  }

  const candidate = value as Partial<AppSettings>;

  return {
    showPlayableIndicators: candidate.showPlayableIndicators ?? true,
    showStackCounts: candidate.showStackCounts ?? true,
    cardBackStyle: isBackStyle(candidate.cardBackStyle)
      ? candidate.cardBackStyle
      : 'Red',
  };
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const storedValue = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!storedValue) {
      return DEFAULT_APP_SETTINGS;
    }

    return normalizeAppSettings(JSON.parse(storedValue));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
};

export const saveAppSettings = async (settings: AppSettings) => {
  try {
    await AsyncStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Ignore storage failures and keep the in-memory settings active.
  }
};

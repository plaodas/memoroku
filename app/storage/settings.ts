import * as SecureStore from 'expo-secure-store';

const URL_KEY = 'memoroku.minutes.baseUrl';
const TOKEN_KEY = 'memoroku.minutes.token';
const HOLD_KEY = 'memoroku.record.hold';
const MODE_KEY = 'memoroku.transcription.mode';

export type TranscriptionMode = 'minutes' | 'device';

export type MinutesSettings = {
  baseUrl: string;
  token: string;
  mode: TranscriptionMode;
};

function parseMode(value: string | null): TranscriptionMode {
  return value === 'device' ? 'device' : 'minutes';
}

export async function loadMinutesSettings(): Promise<MinutesSettings> {
  const [baseUrl, token, mode] = await Promise.all([
    SecureStore.getItemAsync(URL_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(MODE_KEY),
  ]);
  return {
    baseUrl: baseUrl ?? '',
    token: token ?? '',
    mode: parseMode(mode),
  };
}

export async function saveMinutesSettings(settings: MinutesSettings): Promise<void> {
  const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '');
  const token = settings.token.trim();
  await SecureStore.setItemAsync(URL_KEY, baseUrl);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(MODE_KEY, settings.mode);
}

export async function loadHoldToRecord(): Promise<boolean | null> {
  const value = await SecureStore.getItemAsync(HOLD_KEY);
  if (value === '1') {
    return true;
  }
  if (value === '0') {
    return false;
  }
  return null;
}

export async function saveHoldToRecord(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(HOLD_KEY, enabled ? '1' : '0');
}

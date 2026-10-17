import * as SecureStore from 'expo-secure-store';

const URL_KEY = 'memoroku.minutes.baseUrl';
const TOKEN_KEY = 'memoroku.minutes.token';
const HOLD_KEY = 'memoroku.record.hold';

export type MinutesSettings = {
  baseUrl: string;
  token: string;
};

export async function loadMinutesSettings(): Promise<MinutesSettings> {
  const [baseUrl, token] = await Promise.all([
    SecureStore.getItemAsync(URL_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);
  return {
    baseUrl: baseUrl ?? '',
    token: token ?? '',
  };
}

export async function saveMinutesSettings(settings: MinutesSettings): Promise<void> {
  const baseUrl = settings.baseUrl.trim().replace(/\/+$/, '');
  const token = settings.token.trim();
  await SecureStore.setItemAsync(URL_KEY, baseUrl);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
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

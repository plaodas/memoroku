import * as SecureStore from 'expo-secure-store';

const URL_KEY = 'memoroku.minutes.baseUrl';
const TOKEN_KEY = 'memoroku.minutes.token';

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

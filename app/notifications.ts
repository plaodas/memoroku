import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('default', {
    name: '文字起こし',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function prepareNotifications(): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.canAskAgain === false) {
    return;
  }
  await Notifications.requestPermissionsAsync();
}

export async function notifyMemoReady(memoId: string, body: string): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) {
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '文字起こしができました',
      body,
      data: { memoId },
    },
    trigger: null,
  });
}

export function memoIdFromNotification(data: Record<string, unknown> | undefined): string | null {
  const memoId = data?.memoId;
  return typeof memoId === 'string' && memoId.length > 0 ? memoId : null;
}

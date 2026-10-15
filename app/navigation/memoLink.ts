import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { memoIdFromNotification } from '../notifications';

export function memoIdFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const match = url.match(/memo\/([^/?#]+)/);
  if (!match?.[1]) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function listenForMemoOpens(onMemo: (memoId: string) => void): () => void {
  const openUrl = (url: string | null) => {
    const memoId = memoIdFromUrl(url);
    if (memoId) {
      onMemo(memoId);
    }
  };

  const linkSubscription = Linking.addEventListener('url', (event) => {
    openUrl(event.url);
  });
  void Linking.getInitialURL().then(openUrl);

  const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const memoId = memoIdFromNotification(response.notification.request.content.data);
      if (memoId) {
        onMemo(memoId);
      }
    },
  );
  void Notifications.getLastNotificationResponseAsync().then(async (response) => {
    if (!response) {
      return;
    }
    const memoId = memoIdFromNotification(response.notification.request.content.data);
    if (memoId) {
      onMemo(memoId);
    }
    await Notifications.clearLastNotificationResponseAsync();
  });

  return () => {
    linkSubscription.remove();
    notificationSubscription.remove();
  };
}

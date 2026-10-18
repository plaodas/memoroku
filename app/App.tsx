import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { listenForMemoOpens, listenForRecordStarts } from './navigation/memoLink';

if (Platform.OS === 'ios') {
  require('./widgets/MemoWidget');
}
import Home from './screens/Home';
import Settings from './screens/Settings';
import { prepareNotifications } from './notifications';
import { resumePendingTranscriptions } from './transcription/pipeline';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'settings'>('home');
  const [focusedMemoId, setFocusedMemoId] = useState<string | null>(null);
  const [recordRequest, setRecordRequest] = useState(0);

  useEffect(() => {
    return listenForMemoOpens((memoId) => {
      setFocusedMemoId(memoId);
      setScreen('home');
    });
  }, []);

  useEffect(() => {
    return listenForRecordStarts(() => {
      setScreen('home');
      setRecordRequest((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    prepareNotifications().catch(() => undefined);
    resumePendingTranscriptions().catch(() => undefined);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      {screen === 'settings' ? (
        <Settings
          onClose={() => {
            setScreen('home');
            resumePendingTranscriptions().catch(() => undefined);
          }}
        />
      ) : (
        <Home
          focusedMemoId={focusedMemoId}
          onOpenSettings={() => setScreen('settings')}
          recordRequest={recordRequest}
        />
      )}
    </>
  );
}

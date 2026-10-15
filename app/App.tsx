import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { listenForMemoOpens } from './navigation/memoLink';

if (Platform.OS === 'ios') {
  require('./widgets/MemoWidget');
}
import Home from './screens/Home';
import Settings from './screens/Settings';
import { resumePendingTranscriptions } from './transcription/pipeline';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'settings'>('home');
  const [focusedMemoId, setFocusedMemoId] = useState<string | null>(null);

  useEffect(() => {
    return listenForMemoOpens((memoId) => {
      setFocusedMemoId(memoId);
      setScreen('home');
    });
  }, []);

  useEffect(() => {
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
        <Home focusedMemoId={focusedMemoId} onOpenSettings={() => setScreen('settings')} />
      )}
    </>
  );
}

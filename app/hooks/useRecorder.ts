import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { startRecording, stopRecording } from '../../native-modules/recorder';

async function ensureMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'マイク',
    message: 'メモを録音するためにマイクを使います。',
    buttonPositive: '許可',
    buttonNegative: '拒否',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) {
      return;
    }
    const timer = setInterval(() => {
      if (startedAt.current) {
        setElapsedMs(Date.now() - startedAt.current);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  const start = useCallback(async () => {
    setError(null);
    const allowed = await ensureMicrophonePermission();
    if (!allowed) {
      setError('マイクの許可が必要です。');
      return;
    }
    try {
      await startRecording();
      startedAt.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音を開始できませんでした。');
    }
  }, []);

  const stop = useCallback(async () => {
    const durationMs = startedAt.current ? Date.now() - startedAt.current : elapsedMs;
    try {
      const uri = await stopRecording();
      return { uri, durationMs };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音を停止できませんでした。');
      return { uri: null, durationMs };
    } finally {
      startedAt.current = null;
      setRecording(false);
      setElapsedMs(0);
    }
  }, [elapsedMs]);

  return { recording, elapsedMs, error, start, stop };
}

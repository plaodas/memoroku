import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  microphoneGranted as iosMicrophoneGranted,
  readRecordingLevel,
  startRecording,
  stopRecording,
} from '../../native-modules/recorder';
import { deleteAudioFile } from '../storage/audioFiles';

const LEVEL_BARS = 18;

export async function microphoneGranted(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  }
  if (Platform.OS === 'ios') {
    return iosMicrophoneGranted();
  }
  return false;
}

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
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_BARS).fill(0.08));
  const startedAt = useRef<number | null>(null);
  const releasedDuringStart = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    if (!recording) {
      setLevels(Array(LEVEL_BARS).fill(0.08));
      return;
    }
    const timer = setInterval(() => {
      if (startedAt.current) {
        setElapsedMs(Date.now() - startedAt.current);
      }
      readRecordingLevel()
        .then((level) => {
          const next = Math.max(0.08, Math.min(1, level));
          setLevels((current) => [...current.slice(1), next]);
        })
        .catch(() => undefined);
    }, 90);
    return () => clearInterval(timer);
  }, [recording]);

  const start = useCallback(async () => {
    setError(null);
    releasedDuringStart.current = false;
    const allowed = await ensureMicrophonePermission();
    if (!allowed) {
      setError('マイクの許可が必要です。');
      return 'denied' as const;
    }
    if (releasedDuringStart.current) {
      return 'cancelled' as const;
    }
    try {
      await startRecording();
      if (releasedDuringStart.current) {
        try {
          const uri = await stopRecording();
          deleteAudioFile(uri);
        } catch {
          // Android rejects stop when no audio was captured.
        }
        return 'cancelled' as const;
      }
      startedAt.current = Date.now();
      active.current = true;
      setElapsedMs(0);
      setRecording(true);
      return 'started' as const;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '録音を開始できませんでした。');
      return 'failed' as const;
    }
  }, []);

  const noteReleased = useCallback(() => {
    releasedDuringStart.current = true;
  }, []);

  const stop = useCallback(async () => {
    const durationMs = startedAt.current ? Date.now() - startedAt.current : elapsedMs;
    try {
      const uri = await stopRecording();
      return { uri, durationMs };
    } catch {
      return { uri: null, durationMs };
    } finally {
      startedAt.current = null;
      active.current = false;
      setRecording(false);
      setElapsedMs(0);
    }
  }, [elapsedMs]);

  return {
    recording,
    elapsedMs,
    error,
    levels,
    isActive: () => active.current,
    start,
    stop,
    noteReleased,
  };
}

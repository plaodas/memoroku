import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';

import { recordingFile } from '../storage/audioFiles';

export function usePlayback() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [memoId, setMemoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.error) {
      setError('録音を再生できませんでした。');
      setMemoId(null);
    }
  }, [status.error]);

  async function toggle(id: string, uri: string): Promise<void> {
    setError(null);
    try {
      if (memoId === id && status.playing) {
        player.pause();
        return;
      }
      if (memoId === id && status.isLoaded && !status.didJustFinish) {
        player.play();
        return;
      }
      const file = recordingFile(uri);
      if (!file.exists) {
        setError('録音ファイルがありません。');
        setMemoId(null);
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      player.replace(file.uri);
      await player.seekTo(0);
      player.play();
      setMemoId(id);
    } catch {
      setError('録音を再生できませんでした。');
      setMemoId(null);
    }
  }

  function stop(): void {
    player.pause();
    setMemoId(null);
  }

  function stopIf(id: string): void {
    if (memoId === id) {
      stop();
    }
  }

  return {
    isPlaying: (id: string) => memoId === id && status.playing,
    error,
    toggle,
    stop,
    stopIf,
  };
}

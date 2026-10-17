import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, closeSwipedCards } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { RecordButton } from '../components/RecordButton';
import { usePlayback } from '../hooks/usePlayback';
import { microphoneGranted, useRecorder } from '../hooks/useRecorder';
import { keepRecording } from '../storage/audioFiles';
import { loadHoldToRecord, loadMinutesSettings, saveHoldToRecord } from '../storage/settings';
import {
  addMemo,
  deleteMemo,
  deleteOldMemos,
  getMemos,
  subscribeMemos,
  type Memo,
} from '../storage/memos';
import { transcribeMemo } from '../transcription/pipeline';
import { colors } from '../theme';
import { publishLatestMemo } from '../widgets/publish';

type Props = {
  focusedMemoId: string | null;
  onOpenSettings: () => void;
};

export default function Home({ focusedMemoId, onOpenSettings }: Props) {
  const recorder = useRecorder();
  const playback = usePlayback();
  const listRef = useRef<FlatList<Memo>>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [holdMode, setHoldMode] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const savedHold = useRef<boolean | null>(null);

  useEffect(() => {
    if (!focusedMemoId) {
      return;
    }
    const index = memos.findIndex((memo) => memo.id === focusedMemoId);
    if (index < 0) {
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
  }, [focusedMemoId, memos]);

  const refresh = useCallback(async () => {
    const removed = await deleteOldMemos();
    if (removed > 0) {
      await publishLatestMemo();
    }
    const [nextMemos, settings] = await Promise.all([getMemos(), loadMinutesSettings()]);
    setMemos(nextMemos);
    setConfigured(Boolean(settings.baseUrl && settings.token));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHoldToRecord(), microphoneGranted()])
      .then(([saved, granted]) => {
        if (cancelled) {
          return;
        }
        savedHold.current = saved;
        setMicAllowed(granted);
        setHoldMode(saved ?? granted);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (recorder.recording) {
      return;
    }
    microphoneGranted()
      .then((granted) => {
        setMicAllowed(granted);
        if (savedHold.current === null) {
          setHoldMode(granted);
        }
      })
      .catch(() => undefined);
  }, [recorder.recording]);

  useEffect(() => {
    const unsubscribe = subscribeMemos(() => {
      refresh().catch(() => undefined);
    });
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return unsubscribe;
  }, [refresh]);

  async function saveRecording() {
    const { uri, durationMs } = await recorder.stop();
    const audioUri = uri ? await keepRecording(uri) : null;
    if (!audioUri) {
      return;
    }
    const memo = await addMemo({
      title: '音声メモ',
      audioUri,
      durationMs,
      status: 'uploading',
    });
    void transcribeMemo(memo.id);
  }

  async function onPressRecord() {
    if (recorder.recording) {
      await saveRecording();
      return;
    }
    playback.stop();
    await recorder.start();
  }

  function onHoldStart() {
    playback.stop();
    recorder.start().catch(() => undefined);
  }

  function onHoldEnd() {
    recorder.noteReleased();
    if (!recorder.isActive()) {
      return;
    }
    saveRecording().catch(() => undefined);
  }

  function onToggleHold(next: boolean) {
    savedHold.current = next;
    setHoldMode(next);
    saveHoldToRecord(next).catch(() => undefined);
  }

  function confirmDelete(memo: Memo) {
    Alert.alert('このメモを削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel', onPress: closeSwipedCards },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          onDelete(memo).catch(() => undefined);
        },
      },
    ]);
  }

  async function onDelete(memo: Memo) {
    playback.stopIf(memo.id);
    await deleteMemo(memo.id);
    await publishLatestMemo();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Memoroku</Text>
          <Pressable accessibilityRole="button" onPress={onOpenSettings}>
            <Text style={styles.settings}>設定</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>メモは 24 時間で消えます。</Text>
        {configured ? null : (
          <Text style={styles.warning}>サーバーの URL とトークンを設定してください。</Text>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={memos}
        extraData={focusedMemoId}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        keyExtractor={(memo) => memo.id}
        directionalLockEnabled
        onScrollBeginDrag={closeSwipedCards}
        style={styles.listView}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? '読み込み中…' : 'メモはまだありません'}</Text>
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={index * 40}>
            <Card
              title={item.title}
              createdAt={item.createdAt}
              durationMs={item.durationMs}
              status={item.status}
              transcript={item.transcript}
              audioUri={item.audioUri}
              playing={playback.isPlaying(item.id)}
              onTogglePlay={() => {
                if (!item.audioUri || recorder.recording) {
                  return;
                }
                playback.toggle(item.id, item.audioUri).catch(() => undefined);
              }}
              onDelete={() => confirmDelete(item)}
              focused={item.id === focusedMemoId}
            />
          </FadeIn>
        )}
      />
      {recorder.error ? <Text style={styles.error}>{recorder.error}</Text> : null}
      {playback.error ? <Text style={styles.error}>{playback.error}</Text> : null}
      {micAllowed ? (
        <View style={styles.mode}>
          <Text style={styles.modeLabel}>押しながら録音</Text>
          <Switch
            accessibilityLabel="押しながら録音"
            disabled={recorder.recording}
            onValueChange={onToggleHold}
            thumbColor={colors.surface}
            trackColor={{ false: colors.line, true: colors.accent }}
            value={holdMode}
          />
        </View>
      ) : null}
      <RecordButton
        recording={recorder.recording}
        elapsedMs={recorder.elapsedMs}
        levels={recorder.levels}
        holdMode={holdMode}
        onPress={() => {
          onPressRecord().catch(() => undefined);
        }}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    gap: 4,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  settings: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  warning: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 8,
  },
  listView: {
    flex: 1,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  mode: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

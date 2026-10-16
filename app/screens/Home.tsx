import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { RecordButton } from '../components/RecordButton';
import { usePlayback } from '../hooks/usePlayback';
import { useRecorder } from '../hooks/useRecorder';
import { keepRecording } from '../storage/audioFiles';
import { loadMinutesSettings } from '../storage/settings';
import {
  addMemo,
  deleteMemo,
  deleteOldMemos,
  getMemos,
  subscribeMemos,
  type Memo,
} from '../storage/memos';
import { transcribeMemo } from '../transcription/pipeline';
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
    const unsubscribe = subscribeMemos(() => {
      refresh().catch(() => undefined);
    });
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return unsubscribe;
  }, [refresh]);

  async function onPressRecord() {
    if (recorder.recording) {
      const { uri, durationMs } = await recorder.stop();
      const audioUri = uri ? await keepRecording(uri) : null;
      const memo = await addMemo({
        title: '音声メモ',
        audioUri,
        durationMs,
        status: audioUri ? 'uploading' : 'failed',
      });
      if (audioUri) {
        void transcribeMemo(memo.id);
      }
      return;
    }
    playback.stop();
    await recorder.start();
  }

  function confirmDelete(memo: Memo) {
    Alert.alert('このメモを削除しますか？', undefined, [
      { text: 'キャンセル', style: 'cancel' },
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
      <RecordButton
        recording={recorder.recording}
        elapsedMs={recorder.elapsedMs}
        onPress={() => {
          onPressRecord().catch(() => undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F3EE',
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
    color: '#1A1A1A',
    fontSize: 32,
    fontWeight: '700',
  },
  settings: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#6B6560',
    fontSize: 14,
  },
  warning: {
    color: '#9B2C2C',
    fontSize: 14,
    marginTop: 8,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  empty: {
    color: '#6B6560',
    fontSize: 15,
    marginTop: 12,
  },
  error: {
    color: '#9B2C2C',
    textAlign: 'center',
    marginBottom: 12,
  },
});

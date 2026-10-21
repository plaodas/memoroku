import Settings from 'lucide-react-native/icons/settings';
import Share2 from 'lucide-react-native/icons/share-2';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, closeSwipedCards } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { RecordButton } from '../components/RecordButton';
import { usePlayback } from '../hooks/usePlayback';
import { microphoneGranted, useRecorder } from '../hooks/useRecorder';
import { keepRecording } from '../storage/audioFiles';
import {
  loadHoldToRecord,
  loadMinutesSettings,
  loadRecordHintSeen,
  saveHoldToRecord,
  saveRecordHintSeen,
} from '../storage/settings';
import {
  addMemo,
  deleteMemo,
  deleteOldMemos,
  getMemos,
  setMemoKept,
  subscribeMemos,
  updateMemo,
  type Memo,
} from '../storage/memos';
import { transcribeMemo } from '../transcription/pipeline';
import { colors } from '../theme';
import { formatTime } from '../utils/formatTime';
import { publishLatestMemo } from '../widgets/publish';

type Props = {
  focusedMemoId: string | null;
  onOpenSettings: () => void;
  recordRequest: number;
};

function shareListText(memos: Memo[]): string {
  return memos
    .flatMap((memo) => {
      const transcript = memo.status === 'ready' ? (memo.transcript?.trim() ?? '') : '';
      return transcript ? [`${formatTime(memo.createdAt)}\n${transcript}`] : [];
    })
    .join('\n\n');
}

export default function Home({ focusedMemoId, onOpenSettings, recordRequest }: Props) {
  const recorder = useRecorder();
  const playback = usePlayback();
  const listRef = useRef<FlatList<Memo>>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [holdMode, setHoldMode] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(focusedMemoId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [hintSeen, setHintSeen] = useState<boolean | null>(null);
  const savedHold = useRef<boolean | null>(null);
  const hintDismissed = useRef(false);
  const shortcutTap = useRef(false);
  const shortcutSawRecording = useRef(false);
  const startFromShortcut = useRef(recorder.start);
  const stopPlayback = useRef(playback.stop);
  const recordingNow = useRef(recorder.recording);
  startFromShortcut.current = recorder.start;
  stopPlayback.current = playback.stop;
  recordingNow.current = recorder.recording;

  useEffect(() => {
    setSelectedId(focusedMemoId);
  }, [focusedMemoId]);

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
    setConfigured(settings.mode === 'device' || Boolean(settings.baseUrl && settings.token));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRecordHintSeen()
      .then((seen) => {
        if (!cancelled && !hintDismissed.current) {
          setHintSeen(seen);
        }
      })
      .catch(() => {
        if (!cancelled && !hintDismissed.current) {
          setHintSeen(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismissHint() {
    if (hintDismissed.current) {
      return;
    }
    hintDismissed.current = true;
    setHintSeen(true);
    saveRecordHintSeen().catch(() => undefined);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHoldToRecord(), microphoneGranted()])
      .then(([saved, granted]) => {
        if (cancelled) {
          return;
        }
        savedHold.current = saved;
        setMicAllowed(granted);
        if (!shortcutTap.current) {
          setHoldMode(saved ?? granted);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function restoreHoldMode() {
    shortcutTap.current = false;
    shortcutSawRecording.current = false;
    setShortcutRecording(false);
    if (savedHold.current === null) {
      microphoneGranted()
        .then((granted) => {
          if (!shortcutTap.current) {
            setHoldMode(granted);
          }
        })
        .catch(() => undefined);
      return;
    }
    setHoldMode(savedHold.current);
  }

  useEffect(() => {
    if (recorder.recording) {
      if (shortcutTap.current) {
        shortcutSawRecording.current = true;
        setHoldMode(false);
      }
      return;
    }
    if (shortcutTap.current && shortcutSawRecording.current) {
      restoreHoldMode();
    }
    microphoneGranted()
      .then((granted) => {
        setMicAllowed(granted);
        if (shortcutTap.current || savedHold.current !== null) {
          return;
        }
        setHoldMode(granted);
      })
      .catch(() => undefined);
  }, [recorder.recording]);

  useEffect(() => {
    if (!recordRequest) {
      return;
    }
    shortcutTap.current = true;
    shortcutSawRecording.current = recordingNow.current;
    setShortcutRecording(true);
    setHoldMode(false);
    stopPlayback.current();
    startFromShortcut
      .current()
      .then((result) => {
        if (result !== 'started') {
          restoreHoldMode();
        }
      })
      .catch(() => {
        restoreHoldMode();
      });
  }, [recordRequest]);

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
    dismissHint();
    playback.stop();
    await recorder.start();
  }

  function onHoldStart() {
    dismissHint();
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
    if (shortcutTap.current) {
      return;
    }
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

  async function onToggleKeep(memo: Memo) {
    await setMemoKept(memo.id, memo.expiresAt !== null);
    await publishLatestMemo();
  }

  function onStartEdit(memoId: string) {
    closeSwipedCards();
    setSelectedId(memoId);
    setEditingId(memoId);
  }

  async function onCommitTranscript(memo: Memo, text: string) {
    setEditingId((current) => (current === memo.id ? null : current));
    const next = text.trim();
    if (!next || next === (memo.transcript ?? '').trim()) {
      return;
    }
    await updateMemo(memo.id, {
      status: 'ready',
      transcript: next,
    });
    await publishLatestMemo();
  }

  const sharedText = shareListText(memos);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Memoroku</Text>
          <View style={styles.headerActions}>
            {sharedText ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="共有"
                onPress={() => {
                  Share.share({ message: sharedText }).catch(() => undefined);
                }}
                style={styles.settingsButton}
              >
                <Share2 color={colors.accent} size={16} strokeWidth={2.25} />
                <Text style={styles.settings}>共有</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="設定"
              onPress={onOpenSettings}
              style={styles.settingsButton}
            >
              <Settings color={colors.accent} size={16} strokeWidth={2.25} />
              <Text style={styles.settings}>設定</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>通常のメモは24時間で消えます。</Text>
        {configured ? null : (
          <Text style={styles.warning}>サーバーの URL とトークンを設定してください。</Text>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={memos}
        extraData={`${selectedId ?? ''}:${editingId ?? ''}`}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
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
              createdAt={item.createdAt}
              durationMs={item.durationMs}
              status={item.status}
              transcript={item.transcript}
              audioUri={item.audioUri}
              playing={playback.isPlaying(item.id)}
              onTogglePlay={() => {
                setSelectedId(item.id);
                if (!item.audioUri || recorder.recording) {
                  return;
                }
                playback.toggle(item.id, item.audioUri).catch(() => undefined);
              }}
              onDelete={() => {
                setSelectedId(item.id);
                confirmDelete(item);
              }}
              kept={item.expiresAt === null}
              onToggleKeep={() => {
                setSelectedId(item.id);
                onToggleKeep(item).catch(() => undefined);
              }}
              onSelect={() => setSelectedId(item.id)}
              focused={item.id === selectedId}
              editing={item.id === editingId}
              onStartEdit={() => onStartEdit(item.id)}
              onCommit={(text) => {
                onCommitTranscript(item, text).catch(() => undefined);
              }}
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
            disabled={recorder.recording || shortcutRecording}
            onValueChange={onToggleHold}
            thumbColor={colors.surface}
            trackColor={{ false: colors.line, true: colors.accent }}
            value={holdMode}
          />
        </View>
      ) : null}
      {hintSeen === false && !recorder.recording && !shortcutRecording ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="タップで開始、もう一度で終了。押しながら録音もあります。タップして閉じる"
          onPress={dismissHint}
          style={styles.hint}
        >
          <Text style={styles.hintText}>タップで開始、もう一度で終了</Text>
          <Text style={styles.hintText}>押しながら録音もあります</Text>
        </Pressable>
      ) : null}
      <RecordButton
        recording={recorder.recording}
        elapsedMs={recorder.elapsedMs}
        levels={recorder.levels}
        holdMode={holdMode && !shortcutRecording}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  hint: {
    alignSelf: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    gap: 2,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hintText: {
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
  },
});

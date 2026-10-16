import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MemoStatus } from '../storage/memos';
import { formatDuration, formatTime } from '../utils/formatTime';

type Props = {
  title: string;
  createdAt: number;
  durationMs: number;
  status: MemoStatus;
  transcript: string | null;
  audioUri: string | null;
  playing: boolean;
  onTogglePlay: () => void;
  onDelete: () => void;
  focused?: boolean;
};

const STATUS_LABEL: Record<Exclude<MemoStatus, 'ready'>, string> = {
  recording: '録音中',
  uploading: '送信中',
  transcribing: '文字起こし中',
  failed: '文字起こしに失敗しました',
};

export function Card({
  title,
  createdAt,
  durationMs,
  status,
  transcript,
  audioUri,
  playing,
  onTogglePlay,
  onDelete,
  focused,
}: Props) {
  const body = status === 'ready' ? transcript : STATUS_LABEL[status];
  return (
    <View style={[styles.card, focused && styles.focused]}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      <View style={styles.actions}>
        {audioUri ? (
          <Pressable accessibilityRole="button" onPress={onTogglePlay}>
            <Text style={styles.action}>{playing ? '停止' : '再生'}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onDelete}>
          <Text style={styles.action}>削除</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        {formatTime(createdAt)} · {formatDuration(durationMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  focused: {
    borderColor: '#1A1A1A',
  },
  title: {
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  action: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: '#6B6560',
    fontSize: 13,
  },
});

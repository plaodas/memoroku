import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
} from 'react-native';

import type { MemoStatus } from '../storage/memos';
import { colors } from '../theme';
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

const REVEAL = 88;

const STATUS_LABEL: Record<Exclude<MemoStatus, 'ready'>, string> = {
  recording: '録音中',
  uploading: '送信中',
  transcribing: '文字起こし中',
  failed: '文字起こしに失敗しました',
};

const closers = new Set<() => void>();

export function closeSwipedCards(): void {
  for (const close of closers) {
    close();
  }
}

type SwipeHandlers = {
  shouldSwipe: (gesture: PanResponderGestureState) => boolean;
  grant: () => void;
  move: (gesture: PanResponderGestureState) => void;
  release: (gesture: PanResponderGestureState) => void;
  terminate: () => void;
};

function isLeftSwipe(gesture: PanResponderGestureState, opened: boolean): boolean {
  const horizontal = Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
  if (!horizontal) {
    return false;
  }
  return gesture.dx < 0 || opened;
}

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
  const translateX = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);
  const width = useRef(0);
  const dragging = useRef(false);
  const tracking = useRef(false);
  const opened = useRef(false);
  const onDeleteRef = useRef(onDelete);
  const [revealed, setRevealed] = useState(false);
  onDeleteRef.current = onDelete;

  function snap(to: number) {
    offset.current = to;
    opened.current = to !== 0;
    setRevealed(to !== 0);
    Animated.timing(translateX, {
      toValue: to,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }

  const closeSelf = useRef<() => void>(() => undefined);
  closeSelf.current = () => {
    if (dragging.current) {
      return;
    }
    snap(0);
  };

  useEffect(() => {
    const close = () => closeSelf.current();
    closers.add(close);
    return () => {
      closers.delete(close);
    };
  }, []);

  useEffect(() => {
    translateX.setValue(0);
    offset.current = 0;
    opened.current = false;
    setRevealed(false);
  }, [createdAt, translateX]);

  const swipe = useRef<SwipeHandlers>({
    shouldSwipe: () => false,
    grant: () => undefined,
    move: () => undefined,
    release: () => undefined,
    terminate: () => undefined,
  });

  swipe.current = {
    shouldSwipe: (gesture) => isLeftSwipe(gesture, opened.current),
    grant: () => {
      dragging.current = true;
      tracking.current = false;
      translateX.stopAnimation((value) => {
        offset.current = value;
        tracking.current = true;
      });
      for (const close of closers) {
        close();
      }
    },
    move: (gesture) => {
      if (!tracking.current) {
        return;
      }
      const next = Math.min(0, Math.max(-width.current, offset.current + gesture.dx));
      translateX.setValue(next);
    },
    release: (gesture) => {
      dragging.current = false;
      tracking.current = false;
      const rowWidth = width.current;
      if (rowWidth <= 0) {
        snap(0);
        return;
      }
      const next = Math.min(0, Math.max(-rowWidth, offset.current + gesture.dx));
      const deep = next <= -rowWidth * 0.45 || (gesture.vx <= -1.2 && next <= -REVEAL);
      const keepOpen = next <= -REVEAL / 2 || (gesture.vx <= -0.5 && next < -24);
      if (deep) {
        snap(-REVEAL);
        onDeleteRef.current();
        return;
      }
      snap(keepOpen ? -REVEAL : 0);
    },
    terminate: () => {
      dragging.current = false;
      tracking.current = false;
      translateX.stopAnimation((value) => {
        snap(value <= -REVEAL / 2 ? -REVEAL : 0);
      });
    },
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => swipe.current.shouldSwipe(gesture),
      onMoveShouldSetPanResponderCapture: (_, gesture) => swipe.current.shouldSwipe(gesture),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => swipe.current.grant(),
      onPanResponderMove: (_, gesture) => swipe.current.move(gesture),
      onPanResponderRelease: (_, gesture) => swipe.current.release(gesture),
      onPanResponderTerminate: () => swipe.current.terminate(),
    }),
  ).current;

  return (
    <View style={styles.shadow}>
      <View
        style={[styles.clip, focused && styles.focused]}
        onLayout={(event) => {
          width.current = event.nativeEvent.layout.width;
        }}
      >
        <View
          pointerEvents={revealed ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, styles.underlay]}
          accessibilityElementsHidden={!revealed}
          importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="削除"
            onPress={onDelete}
            style={styles.deleteHit}
          >
            <Text style={styles.deleteText}>削除</Text>
          </Pressable>
        </View>
        <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
          <View style={styles.card}>
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
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: '#0c0c14',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  clip: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.danger,
  },
  focused: {
    borderColor: colors.accent,
  },
  underlay: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteHit: {
    width: REVEAL,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  action: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
});

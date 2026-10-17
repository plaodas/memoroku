import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { formatDuration } from '../utils/formatTime';

type Props = {
  recording: boolean;
  elapsedMs: number;
  levels: number[];
  holdMode: boolean;
  onPress: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
};

export function RecordButton({
  recording,
  elapsedMs,
  levels,
  holdMode,
  onPress,
  onHoldStart,
  onHoldEnd,
}: Props) {
  const label = recording ? '録音中' : holdMode ? '押しながら' : '録音';
  return (
    <View style={styles.wrap}>
      {recording ? (
        <View style={styles.wave} accessibilityLabel="録音中の音量">
          {levels.map((level, index) => (
            <View
              key={index}
              style={[styles.bar, { height: 4 + level * 28 }]}
            />
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? '録音を止める' : holdMode ? '押している間、録音する' : '録音を始める'}
        onPress={holdMode ? undefined : onPress}
        onPressIn={holdMode ? onHoldStart : undefined}
        onPressOut={holdMode ? onHoldEnd : undefined}
        style={[styles.button, recording && styles.buttonActive]}
      >
        <View style={[styles.mark, recording && styles.markActive]} />
      </Pressable>
      <Text style={styles.label}>
        {recording ? `${label} ${formatDuration(elapsedMs)}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  wave: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  markActive: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});

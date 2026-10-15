import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '../utils/formatTime';

type Props = {
  recording: boolean;
  elapsedMs: number;
  onPress: () => void;
};

export function RecordButton({ recording, elapsedMs, onPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? '録音を止める' : '録音を始める'}
        onPress={onPress}
        style={[styles.button, recording && styles.buttonActive]}
      >
        <View style={[styles.mark, recording && styles.markActive]} />
      </Pressable>
      <Text style={styles.label}>{recording ? formatDuration(elapsedMs) : '録音'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6E0D8',
  },
  buttonActive: {
    borderColor: '#E23D3D',
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E23D3D',
  },
  markActive: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  label: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '600',
  },
});

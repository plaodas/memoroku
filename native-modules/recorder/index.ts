import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

type NativeRecorderModule = {
  startRecording(): Promise<boolean>;
  stopRecording(): Promise<string | null>;
  readLevel(): Promise<number>;
  microphoneGranted(): Promise<boolean>;
  recordingStartedAt(): Promise<number>;
  convertToWav(uri: string): Promise<string>;
};

const NativeRecorder = requireNativeModule<NativeRecorderModule>('NativeRecorder');

export function startRecording(): Promise<boolean> {
  return NativeRecorder.startRecording();
}

export function stopRecording(): Promise<string | null> {
  return NativeRecorder.stopRecording();
}

export function readRecordingLevel(): Promise<number> {
  return NativeRecorder.readLevel();
}

export function recordingStartedAt(): Promise<number> {
  if (Platform.OS !== 'android') {
    return Promise.resolve(0);
  }
  return NativeRecorder.recordingStartedAt();
}

export function microphoneGranted(): Promise<boolean> {
  return NativeRecorder.microphoneGranted();
}

export function convertRecordingToWav(uri: string): Promise<string> {
  return NativeRecorder.convertToWav(uri);
}

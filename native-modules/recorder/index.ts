import { requireNativeModule } from 'expo';

type NativeRecorderModule = {
  startRecording(): Promise<boolean>;
  stopRecording(): Promise<string | null>;
  readLevel(): Promise<number>;
  microphoneGranted(): Promise<boolean>;
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

export function microphoneGranted(): Promise<boolean> {
  return NativeRecorder.microphoneGranted();
}

export function convertRecordingToWav(uri: string): Promise<string> {
  return NativeRecorder.convertToWav(uri);
}

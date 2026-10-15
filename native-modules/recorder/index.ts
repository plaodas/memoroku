import { requireNativeModule } from 'expo';

type NativeRecorderModule = {
  startRecording(): Promise<boolean>;
  stopRecording(): Promise<string | null>;
};

const NativeRecorder = requireNativeModule<NativeRecorderModule>('NativeRecorder');

export function startRecording(): Promise<boolean> {
  return NativeRecorder.startRecording();
}

export function stopRecording(): Promise<string | null> {
  return NativeRecorder.stopRecording();
}

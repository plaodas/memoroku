import { Directory, File, Paths } from 'expo-file-system';

import { MinutesError } from '../api/minutes';
import { convertRecordingToWav } from '../../native-modules/recorder';

type WhisperContext = {
  transcribe(
    filePath: string,
    options?: { language?: string },
  ): {
    promise: Promise<{ result: string }>;
  };
};

type WhisperModule = {
  initWhisper(options: { filePath: string }): Promise<WhisperContext>;
};

// package exports にルートが無いので、Metro は react-native フィールドから解決する。
const { initWhisper } = require('whisper.rn') as WhisperModule;

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';
const MIN_MODEL_BYTES = 100 * 1024 * 1024;

function modelDirectory(): Directory {
  const directory = new Directory(Paths.document, 'whisper');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

function modelFile(): File {
  return new File(modelDirectory(), 'ggml-base.bin');
}

function modelSize(file: File): number {
  if (!file.exists) {
    return 0;
  }
  return file.info().size ?? 0;
}

export function whisperModelReady(): boolean {
  return modelSize(modelFile()) >= MIN_MODEL_BYTES;
}

function removeIncompleteModel(): void {
  const file = modelFile();
  if (file.exists && modelSize(file) < MIN_MODEL_BYTES) {
    file.delete();
  }
}

export async function downloadWhisperModel(
  onProgress?: (ratio: number | null) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (whisperModelReady()) {
    onProgress?.(1);
    return;
  }
  removeIncompleteModel();
  const destination = modelFile();
  try {
    await File.downloadFileAsync(MODEL_URL, destination, {
      signal,
      onProgress(progress) {
        if (progress.totalBytes > 0) {
          onProgress?.(progress.bytesWritten / progress.totalBytes);
          return;
        }
        onProgress?.(null);
      },
    });
  } catch (error) {
    removeIncompleteModel();
    throw error;
  }
  if (!whisperModelReady()) {
    removeIncompleteModel();
    throw new Error('モデルを保存できませんでした。');
  }
}

let contextPromise: Promise<WhisperContext> | null = null;

function whisperContext(): Promise<WhisperContext> {
  if (contextPromise) {
    return contextPromise;
  }
  const file = modelFile();
  const pending = initWhisper({ filePath: file.uri }).catch((error: unknown) => {
    contextPromise = null;
    throw error;
  });
  contextPromise = pending;
  return pending;
}

function deleteConvertedWav(uri: string): void {
  try {
    const file = new File(uri.startsWith('file://') ? uri : `file://${uri}`);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // The converted file is already gone.
  }
}

export async function transcribeOnDevice(audioUri: string): Promise<string> {
  if (!whisperModelReady()) {
    throw new MinutesError('端末内のモデルがありません。設定から取得してください。', 'failed');
  }
  let wavUri: string | null = null;
  try {
    wavUri = await convertRecordingToWav(audioUri);
    const whisper = await whisperContext();
    const { promise } = whisper.transcribe(wavUri, { language: 'ja' });
    const transcribed = await promise;
    const text = transcribed.result.trim();
    if (!text) {
      throw new MinutesError('文字起こしが空です。', 'failed');
    }
    return text;
  } catch (error) {
    if (error instanceof MinutesError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : '端末内の文字起こしに失敗しました。';
    throw new MinutesError(message, 'failed');
  } finally {
    if (wavUri) {
      deleteConvertedWav(wavUri);
    }
  }
}

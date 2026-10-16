import { Directory, File, Paths } from 'expo-file-system';

function asFileUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

export function recordingFile(uri: string): File {
  return new File(asFileUri(uri));
}

export async function keepRecording(uri: string): Promise<string> {
  try {
    const source = recordingFile(uri);
    const directory = new Directory(Paths.document, 'memos');
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
    const destination = new File(directory, source.name);
    await source.move(destination);
    return source.uri;
  } catch {
    return asFileUri(uri);
  }
}

export function deleteAudioFile(uri: string | null): void {
  if (!uri) {
    return;
  }
  try {
    const file = recordingFile(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // The recording is already gone.
  }
}

import { MinutesError, fetchTranscript, upload, waitUntilReady } from '../api/minutes';
import { notifyMemoReady } from '../notifications';
import { deleteOldMemos, getMemo, getPendingMemos, updateMemo } from '../storage/memos';
import { loadMinutesSettings } from '../storage/settings';
import { publishLatestMemo } from '../widgets/publish';
import { firstSentence } from '../widgets/sentence';
import { transcribeOnDevice } from './localWhisper';

const jobs = new Map<string, Promise<void>>();

function reportError(scope: string, error: unknown): void {
  if (error instanceof MinutesError) {
    console.warn(`[memoroku] ${scope} ${error.kind}: ${error.message}`);
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[memoroku] ${scope} ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function uploadUntilAccepted(fileUri: string, memoId: string): Promise<string> {
  for (;;) {
    const current = await getMemo(memoId);
    if (!current) {
      throw new MinutesError('メモがありません。', 'failed');
    }
    try {
      const uploaded = await upload(fileUri);
      return uploaded.taskId;
    } catch (error) {
      if (!(error instanceof MinutesError) || error.kind !== 'network') {
        throw error;
      }
      reportError(`upload ${memoId}`, error);
      await delay(3000);
    }
  }
}

async function finish(memoId: string, transcript: string): Promise<void> {
  const current = await getMemo(memoId);
  if (!current) {
    await publishLatestMemo();
    return;
  }
  const sentence = firstSentence(transcript);
  await updateMemo(memoId, {
    status: 'ready',
    transcript,
  });
  const saved = await getMemo(memoId);
  if (!saved) {
    await publishLatestMemo();
    return;
  }
  await publishLatestMemo();
  await notifyMemoReady(memoId, sentence || '音声メモ');
}

async function run(memoId: string): Promise<void> {
  const memo = await getMemo(memoId);
  if (!memo || memo.status === 'ready' || memo.status === 'failed') {
    return;
  }
  try {
    const settings = await loadMinutesSettings();
    if (settings.mode === 'device') {
      if (!memo.audioUri) {
        await updateMemo(memoId, { status: 'failed' });
        return;
      }
      await updateMemo(memoId, { status: 'transcribing' });
      await finish(memoId, await transcribeOnDevice(memo.audioUri));
      return;
    }
    let taskId = memo.taskId;
    if (!taskId) {
      if (!memo.audioUri) {
        await updateMemo(memoId, { status: 'failed' });
        return;
      }
      await updateMemo(memoId, { status: 'uploading' });
      taskId = await uploadUntilAccepted(memo.audioUri, memoId);
      await updateMemo(memoId, { taskId, status: 'transcribing' });
    } else if (memo.status !== 'transcribing') {
      await updateMemo(memoId, { status: 'transcribing' });
    }
    await waitUntilReady(taskId);
    await finish(memoId, await fetchTranscript(taskId));
  } catch (error) {
    reportError(`transcription ${memoId}`, error);
    if (error instanceof MinutesError && error.kind === 'failed') {
      const current = await getMemo(memoId);
      if (current) {
        await updateMemo(memoId, { status: 'failed' });
      }
    }
  }
}

export function transcribeMemo(memoId: string): Promise<void> {
  const existing = jobs.get(memoId);
  if (existing) {
    return existing;
  }
  const job = run(memoId).finally(() => {
    jobs.delete(memoId);
  });
  jobs.set(memoId, job);
  return job;
}

export async function resumePendingTranscriptions(): Promise<void> {
  await deleteOldMemos();
  await publishLatestMemo();
  const pending = await getPendingMemos();
  await Promise.all(pending.map((memo) => transcribeMemo(memo.id)));
}

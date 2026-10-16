import { MinutesError, fetchTranscript, upload, waitUntilReady } from '../api/minutes';
import { notifyMemoReady } from '../notifications';
import { deleteOldMemos, getMemo, getPendingMemos, updateMemo } from '../storage/memos';
import { publishLatestMemo } from '../widgets/publish';
import { firstSentence } from '../widgets/sentence';

const jobs = new Map<string, Promise<void>>();

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
      await delay(3000);
    }
  }
}

function titleFromSentence(sentence: string): string {
  const stripped = sentence.replace(/[。！？.!?…]+$/u, '').trim();
  return stripped.slice(0, 40) || '音声メモ';
}

async function run(memoId: string): Promise<void> {
  const memo = await getMemo(memoId);
  if (!memo || memo.status === 'ready' || memo.status === 'failed') {
    return;
  }
  try {
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
    const transcript = await fetchTranscript(taskId);
    const current = await getMemo(memoId);
    if (!current) {
      await publishLatestMemo();
      return;
    }
    const sentence = firstSentence(transcript);
    await updateMemo(memoId, {
      status: 'ready',
      transcript,
      title: titleFromSentence(sentence),
    });
    const saved = await getMemo(memoId);
    if (!saved) {
      await publishLatestMemo();
      return;
    }
    await publishLatestMemo();
    await notifyMemoReady(memoId, sentence || titleFromSentence(sentence));
  } catch (error) {
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

import { loadMinutesSettings } from '../storage/settings';

// minutes の呼び出しはここだけ。軽量エンドポイントへ切り替えるときはこのファイルを差し替える。

const POLL_MS = 3000;

export class MinutesError extends Error {
  constructor(
    message: string,
    readonly kind: 'config' | 'failed' | 'network',
  ) {
    super(message);
    this.name = 'MinutesError';
  }
}

type StatusPayload = {
  stage?: string | null;
  status?: string | null;
};

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const { baseUrl, token } = await loadMinutesSettings();
  if (!baseUrl || !token) {
    throw new MinutesError('サーバーの URL とトークンを設定してください。', 'config');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/plain');
  }
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'minutes に接続できません。';
    throw new MinutesError(message, 'network');
  }
}

async function readError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; error?: unknown };
    if (typeof parsed.detail === 'string' && parsed.detail) {
      return parsed.detail;
    }
    if (typeof parsed.error === 'string' && parsed.error) {
      return parsed.error;
    }
  } catch {
    // The body is plain text.
  }
  return body.trim() || `HTTP ${response.status}`;
}

function failureKind(status: number): MinutesError['kind'] {
  if (status === 401) {
    return 'config';
  }
  if (status === 404) {
    return 'failed';
  }
  return 'network';
}

export async function upload(fileUri: string): Promise<{ taskId: string }> {
  const body = new FormData();
  body.append('file', {
    uri: fileUri,
    name: 'memo.m4a',
    type: 'audio/mp4',
  } as unknown as Blob);
  body.append('include_actions', 'false');
  const response = await request('/api/transcribe-upload-bg', { method: 'POST', body });
  if (!response.ok) {
    throw new MinutesError(await readError(response), failureKind(response.status));
  }
  const payload = (await response.json()) as { task_id?: string };
  if (!payload.task_id) {
    throw new MinutesError('task_id がありません。', 'failed');
  }
  return { taskId: payload.task_id };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitUntilReady(taskId: string): Promise<void> {
  const path = `/api/bg/status/${encodeURIComponent(taskId)}`;
  for (;;) {
    try {
      const response = await request(path);
      if (!response.ok) {
        const kind = failureKind(response.status);
        if (kind === 'network') {
          await delay(POLL_MS);
          continue;
        }
        throw new MinutesError(await readError(response), kind);
      }
      const payload = (await response.json()) as StatusPayload;
      const stage = payload.stage || payload.status;
      if (stage === 'success') {
        return;
      }
      if (stage === 'failed' || stage === 'cancelled' || stage === 'deleted') {
        throw new MinutesError('文字起こしに失敗しました。', 'failed');
      }
    } catch (error) {
      if (error instanceof MinutesError && error.kind !== 'network') {
        throw error;
      }
    }
    await delay(POLL_MS);
  }
}

export async function fetchTranscript(taskId: string): Promise<string> {
  const response = await request(
    `/api/bg/transcript/${encodeURIComponent(taskId)}?format=txt`,
  );
  if (!response.ok) {
    throw new MinutesError(await readError(response), failureKind(response.status));
  }
  const transcript = (await response.text()).trim();
  if (!transcript) {
    throw new MinutesError('文字起こしが空です。', 'failed');
  }
  return transcript;
}

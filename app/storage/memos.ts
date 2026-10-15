import * as SQLite from 'expo-sqlite';

const DAY_MS = 24 * 60 * 60 * 1000;

export type MemoStatus = 'recording' | 'uploading' | 'transcribing' | 'ready' | 'failed';

export type Memo = {
  id: string;
  title: string;
  createdAt: number;
  audioUri: string | null;
  durationMs: number;
  taskId: string | null;
  status: MemoStatus;
  transcript: string | null;
};

type MemoRow = {
  id: string;
  title: string;
  createdAt: number;
  audioUri: string | null;
  durationMs: number;
  taskId: string | null;
  status: string;
  transcript: string | null;
};

const STATUSES: MemoStatus[] = ['recording', 'uploading', 'transcribing', 'ready', 'failed'];

const listeners = new Set<() => void>();

let database: Promise<SQLite.SQLiteDatabase> | null = null;

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asStatus(value: string): MemoStatus {
  return STATUSES.includes(value as MemoStatus) ? (value as MemoStatus) : 'ready';
}

function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    audioUri: row.audioUri,
    durationMs: row.durationMs,
    taskId: row.taskId,
    status: asStatus(row.status),
    transcript: row.transcript,
  };
}

function emitMemos(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMemos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function ensureColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(memos)');
  const names = new Set(columns.map((column) => column.name));
  if (!names.has('taskId')) {
    await db.execAsync('ALTER TABLE memos ADD COLUMN taskId TEXT');
  }
  if (!names.has('status')) {
    await db.execAsync("ALTER TABLE memos ADD COLUMN status TEXT NOT NULL DEFAULT 'ready'");
  }
  if (!names.has('transcript')) {
    await db.execAsync('ALTER TABLE memos ADD COLUMN transcript TEXT');
  }
}

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    database = SQLite.openDatabaseAsync('memoroku.db')
      .then(async (db) => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS memos (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            audioUri TEXT,
            durationMs INTEGER NOT NULL,
            taskId TEXT,
            status TEXT NOT NULL DEFAULT 'ready',
            transcript TEXT
          );
        `);
        await ensureColumns(db);
        return db;
      })
      .catch((error) => {
        database = null;
        throw error;
      });
  }
  return database;
}

const MEMO_COLUMNS = 'id, title, createdAt, audioUri, durationMs, taskId, status, transcript';

export async function addMemo(input: {
  title: string;
  audioUri: string | null;
  durationMs: number;
  status?: MemoStatus;
}): Promise<Memo> {
  const memo: Memo = {
    id: createId(),
    title: input.title,
    createdAt: Date.now(),
    audioUri: input.audioUri,
    durationMs: input.durationMs,
    taskId: null,
    status: input.status ?? 'uploading',
    transcript: null,
  };
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO memos (${MEMO_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    memo.id,
    memo.title,
    memo.createdAt,
    memo.audioUri,
    memo.durationMs,
    memo.taskId,
    memo.status,
    memo.transcript,
  );
  emitMemos();
  return memo;
}

export async function getMemos(): Promise<Memo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MemoRow>(
    `SELECT ${MEMO_COLUMNS} FROM memos ORDER BY createdAt DESC`,
  );
  return rows.map(toMemo);
}

export async function getMemo(id: string): Promise<Memo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MemoRow>(
    `SELECT ${MEMO_COLUMNS} FROM memos WHERE id = ?`,
    id,
  );
  return row ? toMemo(row) : null;
}

export async function getPendingMemos(): Promise<Memo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MemoRow>(
    `SELECT ${MEMO_COLUMNS} FROM memos WHERE status IN ('recording', 'uploading', 'transcribing') ORDER BY createdAt ASC`,
  );
  return rows.map(toMemo);
}

export async function getLatestReadyMemo(): Promise<Memo | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MemoRow>(
    `SELECT ${MEMO_COLUMNS} FROM memos
     WHERE status = 'ready' AND transcript IS NOT NULL AND length(trim(transcript)) > 0
     ORDER BY createdAt DESC
     LIMIT 1`,
  );
  return row ? toMemo(row) : null;
}

export async function updateMemo(
  id: string,
  patch: Partial<Pick<Memo, 'title' | 'taskId' | 'status' | 'transcript'>>,
): Promise<void> {
  const assignments: string[] = [];
  const values: (string | null)[] = [];
  if (patch.title !== undefined) {
    assignments.push('title = ?');
    values.push(patch.title);
  }
  if (patch.taskId !== undefined) {
    assignments.push('taskId = ?');
    values.push(patch.taskId);
  }
  if (patch.status !== undefined) {
    assignments.push('status = ?');
    values.push(patch.status);
  }
  if (patch.transcript !== undefined) {
    assignments.push('transcript = ?');
    values.push(patch.transcript);
  }
  if (assignments.length === 0) {
    return;
  }
  const db = await getDatabase();
  await db.runAsync(`UPDATE memos SET ${assignments.join(', ')} WHERE id = ?`, ...values, id);
  emitMemos();
}

export async function deleteOldMemos(now = Date.now()): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM memos WHERE createdAt < ?', now - DAY_MS);
  if (result.changes > 0) {
    emitMemos();
  }
  return result.changes;
}

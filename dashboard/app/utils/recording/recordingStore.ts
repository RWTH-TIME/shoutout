const DB_NAME = "shoutout-recording";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const CHUNKS_STORE = "chunks";

export type RecordingSessionState =
  | "recording"
  | "finishing"
  | "finished"
  | "discarded";

export type RecordingSession = {
  publicId: string;
  mimeType: string;
  startedAt: number;
  nextSequence: number;
  state: RecordingSessionState;
  jobName: string;
};

export type RecordingChunkRecord = {
  publicId: string;
  sequence: number;
  blob: Blob;
  uploaded: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "publicId" });
      }
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const store = db.createObjectStore(CHUNKS_STORE, {
          keyPath: ["publicId", "sequence"],
        });
        store.createIndex("byPublicId", "publicId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function putSession(session: RecordingSession): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SESSIONS_STORE, "readwrite");
  tx.objectStore(SESSIONS_STORE).put(session);
  await transactionDone(tx);
  db.close();
}

export async function getSession(
  publicId: string
): Promise<RecordingSession | null> {
  const db = await openDb();
  const tx = db.transaction(SESSIONS_STORE, "readonly");
  const result = await requestToPromise<RecordingSession | undefined>(
    tx.objectStore(SESSIONS_STORE).get(publicId)
  );
  await transactionDone(tx);
  db.close();
  return result ?? null;
}

export async function listSessions(): Promise<RecordingSession[]> {
  const db = await openDb();
  const tx = db.transaction(SESSIONS_STORE, "readonly");
  const result = await requestToPromise<RecordingSession[]>(
    tx.objectStore(SESSIONS_STORE).getAll()
  );
  await transactionDone(tx);
  db.close();
  return result;
}

export async function deleteSession(publicId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([SESSIONS_STORE, CHUNKS_STORE], "readwrite");
  tx.objectStore(SESSIONS_STORE).delete(publicId);
  const chunkStore = tx.objectStore(CHUNKS_STORE);
  const index = chunkStore.index("byPublicId");
  const keys = await requestToPromise<IDBValidKey[]>(
    index.getAllKeys(publicId)
  );
  for (const key of keys) {
    chunkStore.delete(key);
  }
  await transactionDone(tx);
  db.close();
}

export async function putChunk(chunk: RecordingChunkRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CHUNKS_STORE, "readwrite");
  tx.objectStore(CHUNKS_STORE).put(chunk);
  await transactionDone(tx);
  db.close();
}

export async function markChunkUploaded(
  publicId: string,
  sequence: number
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CHUNKS_STORE, "readwrite");
  const store = tx.objectStore(CHUNKS_STORE);
  const existing = await requestToPromise<RecordingChunkRecord | undefined>(
    store.get([publicId, sequence])
  );
  if (existing) {
    store.put({ ...existing, uploaded: true });
  }
  await transactionDone(tx);
  db.close();
}

export async function deleteChunk(
  publicId: string,
  sequence: number
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CHUNKS_STORE, "readwrite");
  tx.objectStore(CHUNKS_STORE).delete([publicId, sequence]);
  await transactionDone(tx);
  db.close();
}

export async function listChunks(
  publicId: string
): Promise<RecordingChunkRecord[]> {
  const db = await openDb();
  const tx = db.transaction(CHUNKS_STORE, "readonly");
  const index = tx.objectStore(CHUNKS_STORE).index("byPublicId");
  const result = await requestToPromise<RecordingChunkRecord[]>(
    index.getAll(publicId)
  );
  await transactionDone(tx);
  db.close();
  return result.sort((a, b) => a.sequence - b.sequence);
}

export async function listPendingChunks(
  publicId: string
): Promise<RecordingChunkRecord[]> {
  const chunks = await listChunks(publicId);
  return chunks.filter((chunk) => !chunk.uploaded);
}

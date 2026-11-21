const LOCK_PREFIX = "shoutout-recording-";

export function recordingLockName(publicId: string): string {
  return `${LOCK_PREFIX}${publicId}`;
}

export type RecordingLockHandle = {
  release: () => void;
};

export async function acquireRecordingLock(
  publicId: string
): Promise<RecordingLockHandle | null> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return { release: () => undefined };
  }

  let releaseLock: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const acquired = await new Promise<boolean>((resolve) => {
    void navigator.locks
      .request(
        recordingLockName(publicId),
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            resolve(false);
            return;
          }
          resolve(true);
          await held;
        }
      )
      .catch(() => {
        resolve(false);
      });
  });

  if (!acquired || !releaseLock) {
    return null;
  }

  const release = releaseLock;
  return {
    release: () => {
      release();
    },
  };
}

export async function isRecordingLockHeld(publicId: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks?.query) {
    return false;
  }
  try {
    const state = await navigator.locks.query();
    const name = recordingLockName(publicId);
    return (state.held ?? []).some((lock) => lock.name === name);
  } catch {
    return false;
  }
}

export async function tryPeekRecordingLock(
  publicId: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    void navigator.locks
      .request(
        recordingLockName(publicId),
        { ifAvailable: true },
        async (lock) => {
          resolve(lock === null);
        }
      )
      .catch(() => resolve(false));
  });
}

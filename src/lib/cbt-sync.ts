import type { ExamAttemptDTO, ViolationLogEntry } from '../types/lms';

const STORAGE_KEY = 'cendekia_cbt_live_violations_v1';

export interface LiveCbtSyncEntry {
  attemptId: string;
  violationCount: number;
  isLockedByProctor: boolean;
  violationLogs: ViolationLogEntry[];
  updatedAt: number;
}

export function readLiveCbtSyncMap(): Record<string, LiveCbtSyncEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeLiveCbtSyncEntry(entry: LiveCbtSyncEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readLiveCbtSyncMap();
    current[entry.attemptId] = entry;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('cendekia-cbt-sync', { detail: entry }));
  } catch {
    // ignore storage quota errors
  }
}

export function clearLiveCbtSyncEntry(attemptId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readLiveCbtSyncMap();
    delete current[attemptId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('cendekia-cbt-sync', { detail: { attemptId, reset: true } }));
  } catch {
    // ignore storage errors
  }
}

export function mergeAttemptWithLiveSync(attempt: ExamAttemptDTO): ExamAttemptDTO {
  const map = readLiveCbtSyncMap();
  const synced = map[attempt.id];
  if (!synced) return attempt;

  // Prefer whichever has the latest or higher violation state unless server unlocked it after sync
  if (synced.violationCount > attempt.violationCount) {
    return {
      ...attempt,
      violationCount: synced.violationCount,
      isLockedByProctor: synced.isLockedByProctor || attempt.isLockedByProctor,
      violationLogs:
        synced.violationLogs.length >= attempt.violationLogs.length
          ? synced.violationLogs
          : attempt.violationLogs,
    };
  }
  return attempt;
}

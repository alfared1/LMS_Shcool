import type {
  ClientExamQuestion,
  ExamAttemptDTO,
  ServerExamQuestion,
  StoredExamPacket,
  ViolationLogEntry,
} from '../types/lms';
import { deterministicShuffle, scoreExamAnswers } from './core-logic';

const STORAGE_KEY = 'cendekia_cbt_live_violations_v1';
const LOCAL_PACKETS_KEY = 'cendekia_cbt_packets_v1';
const LOCAL_ATTEMPTS_KEY = 'cendekia_cbt_local_attempts_v1';

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

// --- Local Packet & Session Fallback Sync (ensures zero-lag Teacher -> Student -> Proctor sync) ---

export function readStoredExamPackets(): StoredExamPacket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PACKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredExamPacket[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredExamPackets(packets: StoredExamPacket[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PACKETS_KEY, JSON.stringify(packets));
    window.dispatchEvent(new CustomEvent('cendekia-cbt-packets-sync'));
  } catch {
    // ignore storage quota errors
  }
}

export function readLocalAttemptsMap(): Record<string, ExamAttemptDTO> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_ATTEMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ExamAttemptDTO>) : {};
  } catch {
    return {};
  }
}

export function writeLocalAttempt(attempt: ExamAttemptDTO): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readLocalAttemptsMap();
    map[`${attempt.examPacketId}:${attempt.studentNisn}`] = attempt;
    window.localStorage.setItem(LOCAL_ATTEMPTS_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('cendekia-cbt-sync', { detail: attempt }));
  } catch {
    // ignore storage quota errors
  }
}

export function verifyLocalPacketTokenAndCreateSession(input: {
  packet: StoredExamPacket;
  token: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
}): { ok: boolean; error?: string; attempt?: ExamAttemptDTO; questions?: ClientExamQuestion[] } {
  if (input.token.trim().toUpperCase() !== input.packet.dynamicToken.trim().toUpperCase()) {
    return {
      ok: false,
      error: 'Token 6-digit tidak valid. Gunakan token ruang ujian aktif dari Guru / Pengawas.',
    };
  }

  const key = `${input.packet.id}:${input.studentNisn}`;
  const map = readLocalAttemptsMap();
  let attempt = map[key];
  if (!attempt) {
    const now = new Date();
    attempt = {
      id: `attempt-local-${Date.now().toString(36)}`,
      examPacketId: input.packet.id,
      examTitle: input.packet.title,
      subjectName: input.packet.subjectName,
      studentName: input.studentName,
      studentNisn: input.studentNisn,
      classroomName: input.classroomName,
      startedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + input.packet.durationMinutes * 60 * 1000).toISOString(),
      submittedAt: null,
      answers: {},
      flaggedIds: [],
      violationCount: 0,
      maxTabSwitches: input.packet.maxTabSwitches,
      violationLogs: [],
      isLockedByProctor: false,
      deviceResetCount: 0,
      finalScore: null,
    };
    writeLocalAttempt(attempt);
  }

  const questions = buildClientQuestionsForStudent(input.packet.questions, input.studentNisn, input.packet.id);
  return { ok: true, attempt, questions };
}

export function buildClientQuestionsForStudent(
  rawQuestions: ServerExamQuestion[],
  studentNisn: string,
  examId: string
): ClientExamQuestion[] {
  const seed = `${studentNisn}:${examId}`;
  return deterministicShuffle(rawQuestions, seed).map((q) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.questionText,
    imageUrl: q.imageUrl,
    options: deterministicShuffle(q.options, `${seed}:${q.id}`),
  }));
}

export function getLocalExamSession(
  examId: string,
  studentNisn: string
): { attempt: ExamAttemptDTO; questions: ClientExamQuestion[] } | null {
  const packets = readStoredExamPackets();
  const packet = packets.find((p) => p.id === examId);
  const map = readLocalAttemptsMap();
  const attempt = map[`${examId}:${studentNisn}`];
  if (!packet || !attempt) return null;
  return {
    attempt: mergeAttemptWithLiveSync(attempt),
    questions: buildClientQuestionsForStudent(packet.questions, studentNisn, examId),
  };
}

export function submitLocalExamSession(attemptId: string): ExamAttemptDTO | null {
  const map = readLocalAttemptsMap();
  const foundKey = Object.keys(map).find((k) => map[k]?.id === attemptId);
  if (!foundKey) return null;
  const attempt = map[foundKey];
  const packets = readStoredExamPackets();
  const packet = packets.find((p) => p.id === attempt.examPacketId);
  if (!packet) return null;

  const graded = scoreExamAnswers(packet.questions, attempt.answers || {});
  const updated: ExamAttemptDTO = {
    ...attempt,
    submittedAt: new Date().toISOString(),
    finalScore: graded.score,
  };
  writeLocalAttempt(updated);
  return updated;
}

import crypto from 'node:crypto';
import type {
  AuditLogDTO,
  ClientExamQuestion,
  EducationalGame,
  ExamAttemptDTO,
  ExamPacketSummary,
  LearningMaterial,
  ReportCardDTO,
  SchoolConfig,
  ServerExamQuestion,
  ViolationLogEntry,
} from '../types/lms.ts';
import {
  DEFAULT_SCHOOL_CONFIG,
  SEED_AUDIT_LOGS,
  SEED_EXAM_QUESTIONS,
  SEED_GAMES,
  SEED_MATERIALS,
  SEED_REPORT_CARD,
} from '../lib/seed-data.ts';
import {
  deterministicShuffle,
  recalculateGradebookRows,
  scoreExamAnswers,
} from '../lib/core-logic.ts';

interface MemoryPacketRecord {
  id: string;
  title: string;
  examType: ExamPacketSummary['examType'];
  subjectName: string;
  gradeLevel: number;
  durationMinutes: number;
  dynamicToken: string;
  maxTabSwitches: number;
  requireSeb: boolean;
  questions: ServerExamQuestion[];
}

interface MemoryAttemptRecord {
  id: string;
  examPacketId: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  answers: Record<string, string>;
  flaggedIds: string[];
  violationCount: number;
  violationLogs: ViolationLogEntry[];
  isLockedByProctor: boolean;
  deviceResetCount: number;
  finalScore: number | null;
}

interface MemoryUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryGameSessionRecord {
  id: string;
  gameSlug: string;
  userId: number | null;
  studentName: string;
  classroomName: string;
  score: number;
  durationSeconds: number;
  completedAt: string;
}

function createInitialAttempts(): MemoryAttemptRecord[] {
  const now = Date.now();
  const in50Min = new Date(now + 50 * 60 * 1000).toISOString();
  const in45Min = new Date(now + 45 * 60 * 1000).toISOString();
  const startedAgo = new Date(now - 10 * 60 * 1000).toISOString();

  return [
    {
      id: 'attempt-ahmad-uas26',
      examPacketId: 'uas-informatika-2026',
      studentName: 'Ahmad Fauzi',
      studentNisn: '0084921034',
      classroomName: 'X-IPA-1',
      startedAt: startedAgo,
      expiresAt: in50Min,
      submittedAt: null,
      answers: { 'uas-q1': 'B' },
      flaggedIds: [],
      violationCount: 0,
      violationLogs: [],
      isLockedByProctor: false,
      deviceResetCount: 0,
      finalScore: null,
    },
    {
      id: 'attempt-siti-uas26',
      examPacketId: 'uas-informatika-2026',
      studentName: 'Siti Nurhaliza',
      studentNisn: '0084921088',
      classroomName: 'X-IPA-1',
      startedAt: startedAgo,
      expiresAt: in45Min,
      submittedAt: null,
      answers: { 'uas-q1': 'B', 'uas-q2': 'B' },
      flaggedIds: ['uas-q3'],
      violationCount: 3,
      violationLogs: [
        {
          timestamp: new Date(now - 7 * 60 * 1000).toISOString(),
          type: 'TAB_SWITCH',
          detail: 'Berpindah dari jendela ujian (1/3)',
        },
        {
          timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
          type: 'FULLSCREEN_EXIT',
          detail: 'Keluar dari mode Fullscreen (2/3)',
        },
        {
          timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
          type: 'TAB_SWITCH',
          detail: 'Batas maksimal pelanggaran tercapai — Terkunci otomatis (3/3)',
        },
      ],
      isLockedByProctor: true,
      deviceResetCount: 0,
      finalScore: null,
    },
    {
      id: 'attempt-rizky-uas26',
      examPacketId: 'uas-informatika-2026',
      studentName: 'Rizky Ramadhan',
      studentNisn: '0084921102',
      classroomName: 'X-IPA-1',
      startedAt: startedAgo,
      expiresAt: in45Min,
      submittedAt: null,
      answers: { 'uas-q1': 'B', 'uas-q2': 'A', 'uas-q3': 'B' },
      flaggedIds: [],
      violationCount: 1,
      violationLogs: [
        {
          timestamp: new Date(now - 4 * 60 * 1000).toISOString(),
          type: 'WINDOW_BLUR',
          detail: 'Perangkat kehilangan daya / koneksi terputus',
        },
      ],
      isLockedByProctor: false,
      deviceResetCount: 0,
      finalScore: null,
    },
    {
      id: 'attempt-dewi-uas26',
      examPacketId: 'uas-informatika-2026',
      studentName: 'Dewi Lestari',
      studentNisn: '0084921019',
      classroomName: 'X-IPA-1',
      startedAt: new Date(now - 45 * 60 * 1000).toISOString(),
      expiresAt: in45Min,
      submittedAt: new Date(now - 6 * 60 * 1000).toISOString(),
      answers: {
        'uas-q1': 'B',
        'uas-q2': 'B',
        'uas-q3': 'B',
        'uas-q4': 'B',
        'uas-q5': 'C',
      },
      flaggedIds: [],
      violationCount: 0,
      violationLogs: [],
      isLockedByProctor: false,
      deviceResetCount: 0,
      finalScore: 92.5,
    },
  ];
}

const state = {
  schoolConfig: { ...DEFAULT_SCHOOL_CONFIG },
  games: SEED_GAMES.map((g) => ({ ...g })),
  gameSessions: [] as MemoryGameSessionRecord[],
  materials: SEED_MATERIALS.map((m) => ({ ...m })),
  examPackets: [
    {
      id: 'uas-informatika-2026',
      title: 'Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital',
      examType: 'UAS' as ExamPacketSummary['examType'],
      subjectName: 'Informatika & Literasi Digital',
      gradeLevel: 10,
      durationMinutes: 60,
      dynamicToken: 'UJIAN26',
      maxTabSwitches: 3,
      requireSeb: false,
      questions: SEED_EXAM_QUESTIONS.map((q) => ({ ...q })),
    },
  ] as MemoryPacketRecord[],
  examAttempts: createInitialAttempts(),
  reportCard: {
    ...SEED_REPORT_CARD,
    grades: SEED_REPORT_CARD.grades.map((g) => ({ ...g })),
    attendance: { ...SEED_REPORT_CARD.attendance },
  } as ReportCardDTO,
  auditLogs: SEED_AUDIT_LOGS.map((l) => ({ ...l })),
  users: [] as MemoryUserRecord[],
};

function mapAttempt(
  a: MemoryAttemptRecord,
  examTitle = 'UAS Ganjil Informatika',
  subjectName = 'Informatika',
  maxTabSwitches = 3
): ExamAttemptDTO {
  return {
    id: a.id,
    examPacketId: a.examPacketId,
    examTitle,
    subjectName,
    studentName: a.studentName,
    studentNisn: a.studentNisn,
    classroomName: a.classroomName,
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    submittedAt: a.submittedAt,
    answers: { ...a.answers },
    flaggedIds: [...a.flaggedIds],
    violationCount: a.violationCount,
    maxTabSwitches,
    violationLogs: [...a.violationLogs],
    isLockedByProctor: a.isLockedByProctor,
    deviceResetCount: a.deviceResetCount,
    finalScore: a.finalScore,
  };
}

export const memoryStore = {
  insertAuditLog(entry: {
    actorName: string;
    actorRole: string;
    action: string;
    targetInfo: string;
    oldValue?: string | null;
    newValue?: string | null;
    reason?: string | null;
    ipAddress?: string;
  }): AuditLogDTO {
    const item: AuditLogDTO = {
      id: `audit-${crypto.randomUUID().slice(0, 8)}`,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      targetInfo: entry.targetInfo,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      reason: entry.reason ?? null,
      ipAddress: entry.ipAddress || '127.0.0.1',
      createdAt: new Date().toISOString(),
    };
    state.auditLogs.unshift(item);
    return item;
  },

  listAuditLogs(limit = 30): AuditLogDTO[] {
    return state.auditLogs.slice(0, limit);
  },

  getSchoolConfig(): SchoolConfig {
    return { ...state.schoolConfig };
  },

  updateSchoolConfig(patch: Partial<SchoolConfig>, actorName = 'Super Admin'): SchoolConfig {
    const current = state.schoolConfig;
    const next: SchoolConfig = {
      ...current,
      ...patch,
      id: 'default_tenant',
      updatedAt: new Date().toISOString(),
    };
    state.schoolConfig = next;
    this.insertAuditLog({
      actorName,
      actorRole: 'SCHOOL_ADMIN',
      action: 'UPDATE_WHITE_LABEL',
      targetInfo: next.schoolName,
      oldValue: current.schoolShortName,
      newValue: `${next.schoolShortName} (${next.primaryColorHex})`,
      reason: 'Pembaruan konfigurasi White-Label sekolah',
    });
    return { ...next };
  },

  listGames(): EducationalGame[] {
    return [...state.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getGameBySlug(slug: string): EducationalGame | null {
    return state.games.find((g) => g.slug === slug) ?? null;
  },

  createEducationalGame(input: {
    title: string;
    creatorName: string;
    subjectCode: string;
    subjectName: string;
    level: 'SMP' | 'SMA';
    gradeLevel: number;
    engineType: EducationalGame['engineType'];
    configJson: string;
    isAiGenerated?: boolean;
    difficulty?: EducationalGame['difficulty'];
  }): EducationalGame {
    const id = `game-${crypto.randomUUID().slice(0, 8)}`;
    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const created: EducationalGame = {
      id,
      slug: `${slugBase || 'game'}-${crypto.randomUUID().slice(0, 4)}`,
      title: input.title,
      creatorName: input.creatorName,
      subjectCode: input.subjectCode,
      subjectName: input.subjectName,
      level: input.level,
      gradeLevel: input.gradeLevel,
      engineType: input.engineType,
      playCount: 0,
      configJson: input.configJson,
      createdAt: new Date().toISOString(),
      isAiGenerated: Boolean(input.isAiGenerated),
      difficulty: input.difficulty,
    };
    state.games.unshift(created);
    return created;
  },

  recordGameSession(input: {
    slug: string;
    studentName: string;
    classroomName: string;
    score: number;
    durationSeconds: number;
    userId?: number;
  }): { playCount: number } {
    const game = state.games.find((g) => g.slug === input.slug);
    if (game) game.playCount += 1;
    state.gameSessions.unshift({
      id: `gs-${crypto.randomUUID().slice(0, 8)}`,
      gameSlug: input.slug,
      userId: input.userId ?? null,
      studentName: input.studentName,
      classroomName: input.classroomName,
      score: input.score,
      durationSeconds: input.durationSeconds,
      completedAt: new Date().toISOString(),
    });
    return { playCount: game?.playCount ?? 1 };
  },

  getRecentGameSessions(limit = 10) {
    return state.gameSessions.slice(0, limit);
  },

  listMaterials(): LearningMaterial[] {
    return [...state.materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  createLearningMaterial(input: {
    title: string;
    authorName: string;
    subjectName: string;
    level: 'SMP' | 'SMA';
    gradeLevel: number;
    materialType: LearningMaterial['materialType'];
    summary: string;
    contentMarkdown: string;
    fileName?: string;
    fileSizeLabel?: string;
    pdfDataUrl?: string;
  }): LearningMaterial {
    const id = `mat-${crypto.randomUUID().slice(0, 8)}`;
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 42)}-${crypto.randomUUID().slice(0, 4)}`;
    const created: LearningMaterial = {
      id,
      slug,
      title: input.title,
      authorName: input.authorName,
      subjectName: input.subjectName,
      level: input.level,
      gradeLevel: input.gradeLevel,
      materialType: input.materialType,
      summary: input.summary,
      contentMarkdown: input.contentMarkdown,
      viewsCount: 1,
      readMinutes: 8,
      createdAt: new Date().toISOString(),
      fileName: input.fileName,
      fileSizeLabel: input.fileSizeLabel,
      pdfDataUrl: input.pdfDataUrl,
    };
    state.materials.unshift(created);
    return created;
  },

  incrementMaterialView(slug: string): number {
    const mat = state.materials.find((m) => m.slug === slug);
    if (mat) mat.viewsCount += 1;
    return mat?.viewsCount ?? 1;
  },

  listExamPackets(): ExamPacketSummary[] {
    return state.examPackets.map((r) => ({
      id: r.id,
      title: r.title,
      examType: r.examType,
      level: r.gradeLevel <= 9 ? 'SMP' : 'SMA',
      subjectName: r.subjectName,
      gradeLevel: r.gradeLevel,
      durationMinutes: r.durationMinutes,
      maxTabSwitches: r.maxTabSwitches,
      questionCount: r.questions.length,
      requireSeb: r.requireSeb,
    }));
  },

  listManageExamPackets(): Array<
    ExamPacketSummary & { dynamicToken: string; questions: ServerExamQuestion[] }
  > {
    return state.examPackets.map((r) => ({
      id: r.id,
      title: r.title,
      examType: r.examType,
      level: r.gradeLevel <= 9 ? 'SMP' : 'SMA',
      subjectName: r.subjectName,
      gradeLevel: r.gradeLevel,
      durationMinutes: r.durationMinutes,
      maxTabSwitches: r.maxTabSwitches,
      questionCount: r.questions.length,
      requireSeb: r.requireSeb,
      dynamicToken: r.dynamicToken,
      questions: r.questions,
    }));
  },

  createExamPacket(input: {
    id?: string;
    title: string;
    examType: ExamPacketSummary['examType'];
    subjectName: string;
    gradeLevel: number;
    durationMinutes: number;
    maxTabSwitches: number;
    dynamicToken: string;
    requireSeb?: boolean;
    questions: ServerExamQuestion[];
    actorName?: string;
  }): ExamPacketSummary & { dynamicToken: string } {
    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36);
    const id = input.id?.trim() || `${slugBase || 'cbt'}-${crypto.randomUUID().slice(0, 5)}`;
    const normalizedToken = input.dynamicToken.trim().toUpperCase().slice(0, 8) || 'UJIAN26';
    const existing = state.examPackets.find((p) => p.id === id);
    const record: MemoryPacketRecord = {
      id,
      title: input.title,
      examType: input.examType,
      subjectName: input.subjectName,
      gradeLevel: input.gradeLevel,
      durationMinutes: input.durationMinutes,
      maxTabSwitches: input.maxTabSwitches,
      dynamicToken: normalizedToken,
      requireSeb: Boolean(input.requireSeb),
      questions: input.questions,
    };
    if (existing) {
      Object.assign(existing, record);
    } else {
      state.examPackets.push(record);
    }

    this.insertAuditLog({
      actorName: input.actorName || 'Guru Mata Pelajaran',
      actorRole: 'TEACHER',
      action: 'CREATE_CBT_EXAM',
      targetInfo: `${input.title} (${input.questions.length} soal)`,
      oldValue: null,
      newValue: `Token ${normalizedToken} · Durasi ${input.durationMinutes}m`,
      reason: 'Aktivasi paket ujian CBT & bank soal baru',
    });

    return {
      id,
      title: input.title,
      examType: input.examType,
      level: input.gradeLevel <= 9 ? 'SMP' : 'SMA',
      subjectName: input.subjectName,
      gradeLevel: input.gradeLevel,
      durationMinutes: input.durationMinutes,
      maxTabSwitches: input.maxTabSwitches,
      questionCount: input.questions.length,
      requireSeb: Boolean(input.requireSeb),
      dynamicToken: normalizedToken,
    };
  },

  addQuestionsToExamPacket(
    examId: string,
    newQuestions: ServerExamQuestion[],
    actorName = 'Guru Mata Pelajaran'
  ) {
    const packet = state.examPackets.find((p) => p.id === examId);
    if (!packet) return null;
    const prevCount = packet.questions.length;
    for (const q of newQuestions) {
      if (!packet.questions.some((e) => e.id === q.id)) {
        packet.questions.push(q);
      }
    }
    this.insertAuditLog({
      actorName,
      actorRole: 'TEACHER',
      action: 'UPDATE_CBT_QUESTIONS',
      targetInfo: packet.title,
      oldValue: `${prevCount} soal`,
      newValue: `${packet.questions.length} soal`,
      reason: 'Penambahan butir soal ke bank soal paket ujian CBT',
    });
    return {
      id: packet.id,
      title: packet.title,
      examType: packet.examType,
      level: packet.gradeLevel <= 9 ? ('SMP' as const) : ('SMA' as const),
      subjectName: packet.subjectName,
      gradeLevel: packet.gradeLevel,
      durationMinutes: packet.durationMinutes,
      maxTabSwitches: packet.maxTabSwitches,
      questionCount: packet.questions.length,
      requireSeb: packet.requireSeb,
      dynamicToken: packet.dynamicToken,
      questions: packet.questions,
    };
  },

  getProctorOverview(selectedExamId?: string) {
    const packet =
      (selectedExamId ? state.examPackets.find((p) => p.id === selectedExamId) : undefined) ||
      state.examPackets[0];
    const packetMap = new Map(state.examPackets.map((p) => [p.id, p]));
    const examTitle = packet ? packet.title : 'Ujian CBT';
    const maxTab = packet ? packet.maxTabSwitches : 3;

    const sortedAttempts = [...state.examAttempts].sort((a, b) => {
      if (a.isLockedByProctor !== b.isLockedByProctor) {
        return a.isLockedByProctor ? -1 : 1;
      }
      return a.studentName.localeCompare(b.studentName);
    });

    return {
      examId: packet ? packet.id : 'uas-informatika-2026',
      examTitle,
      dynamicToken: packet ? packet.dynamicToken : 'UJIAN26',
      maxTabSwitches: maxTab,
      packets: state.examPackets.map((p) => ({
        id: p.id,
        title: p.title,
        examType: p.examType,
        level: p.gradeLevel <= 9 ? ('SMP' as const) : ('SMA' as const),
        subjectName: p.subjectName,
        gradeLevel: p.gradeLevel,
        durationMinutes: p.durationMinutes,
        maxTabSwitches: p.maxTabSwitches,
        questionCount: p.questions.length,
        requireSeb: p.requireSeb,
        dynamicToken: p.dynamicToken,
      })),
      attempts: sortedAttempts.map((r) => {
        const p = packetMap.get(r.examPacketId);
        return mapAttempt(
          r,
          p?.title || examTitle,
          p?.subjectName || 'Informatika',
          p?.maxTabSwitches ?? maxTab
        );
      }),
    };
  },

  rotateExamToken(examId: string, actorName: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let nextToken = '';
    for (let i = 0; i < 6; i += 1) {
      nextToken += chars[crypto.randomInt(0, chars.length)];
    }
    const packet = state.examPackets.find((p) => p.id === examId);
    const oldToken = packet?.dynamicToken || null;
    if (packet) packet.dynamicToken = nextToken;
    this.insertAuditLog({
      actorName,
      actorRole: 'PROCTOR',
      action: 'ROTATE_EXAM_TOKEN',
      targetInfo: packet?.title || examId,
      oldValue: oldToken,
      newValue: nextToken,
      reason: 'Rotasi token keamanan ruang ujian CBT',
    });
    return nextToken;
  },

  verifyTokenAndGetExam(input: {
    examId: string;
    token: string;
    studentName: string;
    studentNisn: string;
    classroomName: string;
  }): { ok: boolean; error?: string; attempt?: ExamAttemptDTO; questions?: ClientExamQuestion[] } {
    const packet = state.examPackets.find((p) => p.id === input.examId);
    if (!packet) return { ok: false, error: 'Paket ujian tidak ditemukan.' };

    const expectedToken = packet.dynamicToken.trim().toUpperCase();
    if (input.token.trim().toUpperCase() !== expectedToken) {
      return {
        ok: false,
        error: 'Token 6-digit tidak valid. Gunakan token ruang ujian aktif dari Pengawas.',
      };
    }

    let attemptRow = state.examAttempts.find(
      (a) => a.examPacketId === input.examId && a.studentNisn === input.studentNisn
    );

    if (!attemptRow) {
      const now = new Date();
      attemptRow = {
        id: `attempt-${crypto.randomUUID().slice(0, 8)}`,
        examPacketId: input.examId,
        studentName: input.studentName,
        studentNisn: input.studentNisn,
        classroomName: input.classroomName,
        startedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + packet.durationMinutes * 60 * 1000).toISOString(),
        submittedAt: null,
        answers: {},
        flaggedIds: [],
        violationCount: 0,
        violationLogs: [],
        isLockedByProctor: false,
        deviceResetCount: 0,
        finalScore: null,
      };
      state.examAttempts.push(attemptRow);
    }

    const seed = `${input.studentNisn}:${input.examId}`;
    const shuffledQuestions: ClientExamQuestion[] = deterministicShuffle(packet.questions, seed).map(
      (q) => ({
        id: q.id,
        topic: q.topic,
        questionText: q.questionText,
        imageUrl: q.imageUrl,
        options: deterministicShuffle(q.options, `${seed}:${q.id}`),
      })
    );

    return {
      ok: true,
      attempt: mapAttempt(attemptRow, packet.title, packet.subjectName, packet.maxTabSwitches),
      questions: shuffledQuestions,
    };
  },

  getExamSessionForRoom(
    examId: string,
    studentNisn: string
  ): { attempt: ExamAttemptDTO; questions: ClientExamQuestion[] } | null {
    const packet = state.examPackets.find((p) => p.id === examId);
    if (!packet) return null;
    const attemptRow = state.examAttempts.find(
      (a) => a.examPacketId === examId && a.studentNisn === studentNisn
    );
    if (!attemptRow) return null;
    const seed = `${studentNisn}:${examId}`;
    const questions: ClientExamQuestion[] = deterministicShuffle(packet.questions, seed).map(
      (q) => ({
        id: q.id,
        topic: q.topic,
        questionText: q.questionText,
        imageUrl: q.imageUrl,
        options: deterministicShuffle(q.options, `${seed}:${q.id}`),
      })
    );
    return {
      attempt: mapAttempt(attemptRow, packet.title, packet.subjectName, packet.maxTabSwitches),
      questions,
    };
  },

  saveAttemptAnswer(
    attemptId: string,
    answers: Record<string, string>,
    flaggedIds: string[]
  ): ExamAttemptDTO | null {
    const row = state.examAttempts.find((a) => a.id === attemptId);
    if (!row) return null;
    if (!row.submittedAt && !row.isLockedByProctor) {
      row.answers = { ...answers };
      row.flaggedIds = [...flaggedIds];
    }
    return mapAttempt(row);
  },

  recordAttemptViolation(
    attemptId: string,
    type: ViolationLogEntry['type'],
    detail: string
  ): ExamAttemptDTO | null {
    const row = state.examAttempts.find((a) => a.id === attemptId);
    if (!row) return null;
    if (row.submittedAt) return mapAttempt(row);

    const packet = state.examPackets.find((p) => p.id === row.examPacketId);
    const maxTab = packet?.maxTabSwitches ?? 3;
    const prevCount = row.violationCount;
    row.violationCount += 1;
    const wasLocked = row.isLockedByProctor;
    if (row.violationCount >= maxTab) {
      row.isLockedByProctor = true;
    }
    row.violationLogs.push({
      timestamp: new Date().toISOString(),
      type,
      detail,
    });

    if (row.isLockedByProctor && !wasLocked) {
      this.insertAuditLog({
        actorName: 'Sistem Anti-Cheating CBT',
        actorRole: 'SYSTEM_GUARD',
        action: 'AUTO_LOCK_EXAM',
        targetInfo: `${row.studentName} (${packet?.title || 'CBT'})`,
        oldValue: `violationCount: ${prevCount}`,
        newValue: `violationCount: ${row.violationCount} (LOCKED)`,
        reason: detail,
      });
    }

    return mapAttempt(row, packet?.title, packet?.subjectName, maxTab);
  },

  submitExamAttempt(attemptId: string): ExamAttemptDTO | null {
    const row = state.examAttempts.find((a) => a.id === attemptId);
    if (!row) return null;
    const packet = state.examPackets.find((p) => p.id === row.examPacketId);
    if (!packet) return null;
    const graded = scoreExamAnswers(packet.questions, row.answers);
    row.submittedAt = new Date().toISOString();
    row.finalScore = graded.score;

    this.insertAuditLog({
      actorName: row.studentName,
      actorRole: 'STUDENT',
      action: 'SUBMIT_EXAM',
      targetInfo: packet.title,
      oldValue: 'IN_PROGRESS',
      newValue: `SUBMITTED (Skor: ${graded.score})`,
      reason: `Penyelesaian ujian CBT (${graded.correctCount}/${graded.totalQuestions} benar)`,
    });

    return mapAttempt(row, packet.title, packet.subjectName, packet.maxTabSwitches);
  },

  performProctorAction(
    attemptId: string,
    action: 'UNLOCK_SESSION' | 'RESET_DEVICE' | 'ADD_TIME_10M',
    actorName: string
  ): ExamAttemptDTO | null {
    const row = state.examAttempts.find((a) => a.id === attemptId);
    if (!row) return null;

    if (action === 'UNLOCK_SESSION') {
      const oldViolations = row.violationCount;
      row.isLockedByProctor = false;
      row.violationCount = 0;
      this.insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'UNLOCK_EXAM_SESSION',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: `LOCKED (${oldViolations} pelanggaran)`,
        newValue: 'UNLOCKED (0 pelanggaran)',
        reason: 'Verifikasi manual oleh Pengawas Ruang CBT',
      });
    } else if (action === 'RESET_DEVICE') {
      row.deviceResetCount += 1;
      row.isLockedByProctor = false;
      this.insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'RESET_DEVICE_LOGIN',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: `Reset ke-${row.deviceResetCount - 1}`,
        newValue: `Reset ke-${row.deviceResetCount} (Perangkat baru diizinkan)`,
        reason: 'Permintaan pindah perangkat / kendala teknis siswa',
      });
    } else if (action === 'ADD_TIME_10M') {
      const oldExp = row.expiresAt;
      const nextExp = new Date(new Date(oldExp).getTime() + 10 * 60 * 1000).toISOString();
      row.expiresAt = nextExp;
      this.insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'ADD_EXAM_TIME_10M',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: oldExp,
        newValue: nextExp,
        reason: 'Kompensasi waktu teknis +10 menit',
      });
    }

    return mapAttempt(row);
  },

  getPrimaryReportCard(): ReportCardDTO {
    return {
      ...state.reportCard,
      grades: state.reportCard.grades.map((g) => ({ ...g })),
      attendance: { ...state.reportCard.attendance },
    };
  },

  updateGradebookRow(
    code: string,
    scores: { dailyGameAvg: number; taskScore: number; utsScore: number; uasScore: number },
    actorName: string
  ): ReportCardDTO {
    const current = state.reportCard;
    const updatedRows = recalculateGradebookRows(
      current.grades.map((g) => (g.code === code ? { ...g, ...scores } : g))
    );
    const snapshotStr = JSON.stringify(updatedRows);
    const newHash = crypto
      .createHash('sha256')
      .update(`${current.studentNisn}|${current.academicYear}|${snapshotStr}`)
      .digest('hex');

    const oldHashPrefix = current.sha256Hash.slice(0, 12);
    state.reportCard = {
      ...current,
      grades: updatedRows,
      sha256Hash: newHash,
      publishedAt: new Date().toISOString(),
    };

    this.insertAuditLog({
      actorName,
      actorRole: 'TEACHER',
      action: 'UPDATE_FINAL_GRADE',
      targetInfo: `${current.studentName} · Mapel ${code}`,
      oldValue: oldHashPrefix,
      newValue: newHash.slice(0, 12),
      reason: 'Pembaruan nilai teragregasi & regenerasi hash SHA-256 E-Rapor',
    });

    return this.getPrimaryReportCard();
  },

  verifyReportCardByHash(hash: string) {
    const cfg = this.getSchoolConfig();
    if (state.reportCard.sha256Hash !== hash) {
      return { valid: false, reportCard: null, schoolConfig: cfg };
    }
    return {
      valid: true,
      reportCard: this.getPrimaryReportCard(),
      schoolConfig: cfg,
    };
  },

  getOrCreateUser(uid: string, email: string, displayName?: string | null, role?: string) {
    const existing = state.users.find((u) => u.uid === uid);
    if (existing) {
      existing.email = email;
      if (displayName) existing.displayName = displayName;
      existing.updatedAt = new Date();
      return existing;
    }
    const created: MemoryUserRecord = {
      id: state.users.length + 1,
      uid,
      email,
      displayName: displayName ?? null,
      role: role || 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    state.users.push(created);
    return created;
  },

  getUsers() {
    return [...state.users];
  },

  updateUserRoleByUid(uid: string, role: string) {
    const existing = state.users.find((u) => u.uid === uid);
    if (!existing) return null;
    existing.role = role;
    existing.updatedAt = new Date();
    return existing;
  },
};

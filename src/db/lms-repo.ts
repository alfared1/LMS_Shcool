import crypto from 'node:crypto';
import { count, desc, eq, and, sql } from 'drizzle-orm';
import { db, isPostgresConfigured, pool } from './index.ts';
import { memoryStore } from './memory-store.ts';
import {
  auditLogs,
  educationalGames,
  examAttempts,
  examPackets,
  gameSessions,
  learningMaterials,
  reportCards,
  schoolConfig,
} from './schema.ts';
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

let seedPromise: Promise<void> | null = null;

async function ensurePgTablesExist(): Promise<void> {
  if (!pool) return;
  try {
    await pool.query('SELECT 1 FROM school_config LIMIT 1');
    return;
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== '42P01') {
      throw err;
    }
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'STUDENT',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS school_config (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      school_short_name TEXT NOT NULL,
      npsn TEXT NOT NULL,
      tagline TEXT NOT NULL,
      address TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      principal_name TEXT NOT NULL,
      principal_nip TEXT NOT NULL,
      primary_color_hex TEXT NOT NULL,
      secondary_color_hex TEXT NOT NULL,
      accent_color_hex TEXT NOT NULL,
      ai_tutor_name TEXT NOT NULL,
      curriculum_type TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS educational_games (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      level TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      engine_type TEXT NOT NULL,
      play_count INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
      difficulty TEXT
    );
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      game_slug TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      student_name TEXT NOT NULL,
      classroom_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_materials (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      author_user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      author_name TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      level TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      material_type TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      views_count INTEGER NOT NULL DEFAULT 0,
      read_minutes INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      file_name TEXT,
      file_size_label TEXT,
      pdf_data_url TEXT
    );
    CREATE TABLE IF NOT EXISTS exam_packets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      dynamic_token TEXT NOT NULL,
      max_tab_switches INTEGER NOT NULL DEFAULT 3,
      require_seb BOOLEAN NOT NULL DEFAULT FALSE,
      questions_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      exam_packet_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      student_nisn TEXT NOT NULL,
      classroom_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      submitted_at TEXT,
      answers_json TEXT NOT NULL DEFAULT '{}',
      flagged_json TEXT NOT NULL DEFAULT '[]',
      violation_count INTEGER NOT NULL DEFAULT 0,
      violation_logs_json TEXT NOT NULL DEFAULT '[]',
      is_locked_by_proctor BOOLEAN NOT NULL DEFAULT FALSE,
      device_reset_count INTEGER NOT NULL DEFAULT 0,
      final_score DOUBLE PRECISION
    );
    CREATE TABLE IF NOT EXISTS report_cards (
      id TEXT PRIMARY KEY,
      student_name TEXT NOT NULL,
      student_nisn TEXT NOT NULL,
      classroom_name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      grades_snapshot_json TEXT NOT NULL,
      attendance_json TEXT NOT NULL,
      homeroom_note TEXT NOT NULL,
      sha256_hash TEXT NOT NULL UNIQUE,
      is_locked BOOLEAN NOT NULL DEFAULT TRUE,
      published_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_info TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      reason TEXT,
      ip_address TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

async function runSeedIfEmpty(): Promise<void> {
  await ensurePgTablesExist();
  const existingConfig = await db
    .select({ id: schoolConfig.id })
    .from(schoolConfig)
    .where(eq(schoolConfig.id, 'default_tenant'))
    .limit(1);

  if (existingConfig.length === 0) {
    await db
      .insert(schoolConfig)
      .values({
        id: DEFAULT_SCHOOL_CONFIG.id,
        schoolName: DEFAULT_SCHOOL_CONFIG.schoolName,
        schoolShortName: DEFAULT_SCHOOL_CONFIG.schoolShortName,
        npsn: DEFAULT_SCHOOL_CONFIG.npsn,
        tagline: DEFAULT_SCHOOL_CONFIG.tagline,
        address: DEFAULT_SCHOOL_CONFIG.address,
        logoUrl: DEFAULT_SCHOOL_CONFIG.logoUrl,
        principalName: DEFAULT_SCHOOL_CONFIG.principalName,
        principalNip: DEFAULT_SCHOOL_CONFIG.principalNip,
        primaryColorHex: DEFAULT_SCHOOL_CONFIG.primaryColorHex,
        secondaryColorHex: DEFAULT_SCHOOL_CONFIG.secondaryColorHex,
        accentColorHex: DEFAULT_SCHOOL_CONFIG.accentColorHex,
        aiTutorName: DEFAULT_SCHOOL_CONFIG.aiTutorName,
        curriculumType: DEFAULT_SCHOOL_CONFIG.curriculumType,
        updatedAt: DEFAULT_SCHOOL_CONFIG.updatedAt,
      })
      .onConflictDoNothing();
  }

  const [{ value: gameCount }] = await db.select({ value: count() }).from(educationalGames);
  if (Number(gameCount) === 0) {
    await db
      .insert(educationalGames)
      .values(
        SEED_GAMES.map((g) => ({
          id: g.id,
          slug: g.slug,
          title: g.title,
          creatorName: g.creatorName,
          subjectCode: g.subjectCode,
          subjectName: g.subjectName,
          level: g.level,
          gradeLevel: g.gradeLevel,
          engineType: g.engineType,
          playCount: g.playCount,
          configJson: g.configJson,
          createdAt: g.createdAt,
          isAiGenerated: Boolean(g.isAiGenerated),
          difficulty: g.difficulty ?? null,
        }))
      )
      .onConflictDoNothing();
  }

  const [{ value: matCount }] = await db.select({ value: count() }).from(learningMaterials);
  if (Number(matCount) === 0) {
    await db
      .insert(learningMaterials)
      .values(
        SEED_MATERIALS.map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          authorName: m.authorName,
          subjectName: m.subjectName,
          level: m.level,
          gradeLevel: m.gradeLevel,
          materialType: m.materialType,
          summary: m.summary,
          contentMarkdown: m.contentMarkdown,
          viewsCount: m.viewsCount,
          readMinutes: m.readMinutes,
          createdAt: m.createdAt,
          fileName: m.fileName ?? null,
          fileSizeLabel: m.fileSizeLabel ?? null,
          pdfDataUrl: m.pdfDataUrl ?? null,
        }))
      )
      .onConflictDoNothing();
  }

  const [{ value: examCount }] = await db.select({ value: count() }).from(examPackets);
  if (Number(examCount) === 0) {
    await db
      .insert(examPackets)
      .values({
        id: 'uas-informatika-2026',
        title: 'Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital',
        examType: 'UAS',
        subjectName: 'Informatika & Literasi Digital',
        gradeLevel: 10,
        durationMinutes: 60,
        dynamicToken: 'UJIAN26',
        maxTabSwitches: 3,
        requireSeb: false,
        questionsJson: JSON.stringify(SEED_EXAM_QUESTIONS),
      })
      .onConflictDoNothing();
  }

  const [{ value: attemptCount }] = await db.select({ value: count() }).from(examAttempts);
  if (Number(attemptCount) === 0) {
    const now = Date.now();
    const in50Min = new Date(now + 50 * 60 * 1000).toISOString();
    const in45Min = new Date(now + 45 * 60 * 1000).toISOString();
    const startedAgo = new Date(now - 10 * 60 * 1000).toISOString();

    await db
      .insert(examAttempts)
      .values([
        {
          id: 'attempt-ahmad-uas26',
          examPacketId: 'uas-informatika-2026',
          studentName: 'Ahmad Fauzi',
          studentNisn: '0084921034',
          classroomName: 'X-IPA-1',
          startedAt: startedAgo,
          expiresAt: in50Min,
          submittedAt: null,
          answersJson: JSON.stringify({ 'uas-q1': 'B' }),
          flaggedJson: JSON.stringify([]),
          violationCount: 0,
          violationLogsJson: JSON.stringify([]),
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
          answersJson: JSON.stringify({ 'uas-q1': 'B', 'uas-q2': 'B' }),
          flaggedJson: JSON.stringify(['uas-q3']),
          violationCount: 3,
          violationLogsJson: JSON.stringify([
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
          ]),
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
          answersJson: JSON.stringify({ 'uas-q1': 'B', 'uas-q2': 'A', 'uas-q3': 'B' }),
          flaggedJson: JSON.stringify([]),
          violationCount: 1,
          violationLogsJson: JSON.stringify([
            {
              timestamp: new Date(now - 4 * 60 * 1000).toISOString(),
              type: 'WINDOW_BLUR',
              detail: 'Perangkat kehilangan daya / koneksi terputus',
            },
          ]),
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
          answersJson: JSON.stringify({
            'uas-q1': 'B',
            'uas-q2': 'B',
            'uas-q3': 'B',
            'uas-q4': 'B',
            'uas-q5': 'C',
          }),
          flaggedJson: JSON.stringify([]),
          violationCount: 0,
          violationLogsJson: JSON.stringify([]),
          isLockedByProctor: false,
          deviceResetCount: 0,
          finalScore: 92.5,
        },
      ])
      .onConflictDoNothing();
  }

  const [{ value: raporCount }] = await db.select({ value: count() }).from(reportCards);
  if (Number(raporCount) === 0) {
    await db
      .insert(reportCards)
      .values({
        id: SEED_REPORT_CARD.id,
        studentName: SEED_REPORT_CARD.studentName,
        studentNisn: SEED_REPORT_CARD.studentNisn,
        classroomName: SEED_REPORT_CARD.classroomName,
        academicYear: SEED_REPORT_CARD.academicYear,
        gradesSnapshotJson: JSON.stringify(SEED_REPORT_CARD.grades),
        attendanceJson: JSON.stringify(SEED_REPORT_CARD.attendance),
        homeroomNote: SEED_REPORT_CARD.homeroomNote,
        sha256Hash: SEED_REPORT_CARD.sha256Hash,
        isLocked: true,
        publishedAt: SEED_REPORT_CARD.publishedAt,
      })
      .onConflictDoNothing();
  }

  const [{ value: auditCount }] = await db.select({ value: count() }).from(auditLogs);
  if (Number(auditCount) === 0) {
    await db
      .insert(auditLogs)
      .values(
        SEED_AUDIT_LOGS.map((log) => ({
          id: log.id,
          actorName: log.actorName,
          actorRole: log.actorRole,
          action: log.action,
          targetInfo: log.targetInfo,
          oldValue: log.oldValue,
          newValue: log.newValue,
          reason: log.reason,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        }))
      )
      .onConflictDoNothing();
  }
}

export async function ensurePgSeeded(): Promise<void> {
  if (!isPostgresConfigured()) return;
  if (!seedPromise) {
    seedPromise = runSeedIfEmpty().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

export async function insertAuditLogPg(entry: {
  actorName: string;
  actorRole: string;
  action: string;
  targetInfo: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  ipAddress?: string;
}): Promise<AuditLogDTO> {
  if (!isPostgresConfigured()) return memoryStore.insertAuditLog(entry);
  try {
    const id = `audit-${crypto.randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();
    const ipAddress = entry.ipAddress || '127.0.0.1';
    await db.insert(auditLogs).values({
      id,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      targetInfo: entry.targetInfo,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      reason: entry.reason ?? null,
      ipAddress,
      createdAt,
    });
    return {
      id,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      targetInfo: entry.targetInfo,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      reason: entry.reason ?? null,
      ipAddress,
      createdAt,
    };
  } catch (error) {
    console.error('Database insert failed in insertAuditLogPg:', error);
    throw new Error('Failed to write audit log.', { cause: error });
  }
}

export async function listAuditLogsPg(limit = 30): Promise<AuditLogDTO[]> {
  if (!isPostgresConfigured()) return memoryStore.listAuditLogs(limit);
  try {
    await ensurePgSeeded();
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      actorRole: r.actorRole,
      action: r.action,
      targetInfo: r.targetInfo,
      oldValue: r.oldValue,
      newValue: r.newValue,
      reason: r.reason,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Database query failed in listAuditLogsPg:', error);
    throw new Error('Failed to load audit logs.', { cause: error });
  }
}

export async function getSchoolConfigPg(): Promise<SchoolConfig> {
  if (!isPostgresConfigured()) return memoryStore.getSchoolConfig();
  try {
    await ensurePgSeeded();
    const rows = await db
      .select()
      .from(schoolConfig)
      .where(eq(schoolConfig.id, 'default_tenant'))
      .limit(1);
    return rows[0] ?? DEFAULT_SCHOOL_CONFIG;
  } catch (error) {
    console.error('Database query failed in getSchoolConfigPg:', error);
    throw new Error('Failed to load school configuration.', { cause: error });
  }
}

export async function updateSchoolConfigPg(
  patch: Partial<SchoolConfig>,
  actorName = 'Super Admin'
): Promise<SchoolConfig> {
  if (!isPostgresConfigured()) return memoryStore.updateSchoolConfig(patch, actorName);
  try {
    const current = await getSchoolConfigPg();
    const next: SchoolConfig = {
      ...current,
      ...patch,
      id: 'default_tenant',
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(schoolConfig)
      .set({
        schoolName: next.schoolName,
        schoolShortName: next.schoolShortName,
        npsn: next.npsn,
        tagline: next.tagline,
        address: next.address,
        logoUrl: next.logoUrl,
        principalName: next.principalName,
        principalNip: next.principalNip,
        primaryColorHex: next.primaryColorHex,
        secondaryColorHex: next.secondaryColorHex,
        accentColorHex: next.accentColorHex,
        aiTutorName: next.aiTutorName,
        curriculumType: next.curriculumType,
        updatedAt: next.updatedAt,
      })
      .where(eq(schoolConfig.id, 'default_tenant'));

    await insertAuditLogPg({
      actorName,
      actorRole: 'SCHOOL_ADMIN',
      action: 'UPDATE_WHITE_LABEL',
      targetInfo: next.schoolName,
      oldValue: current.schoolShortName,
      newValue: `${next.schoolShortName} (${next.primaryColorHex})`,
      reason: 'Pembaruan konfigurasi White-Label sekolah',
    });

    return next;
  } catch (error) {
    console.error('Database update failed in updateSchoolConfigPg:', error);
    throw new Error('Failed to update school configuration.', { cause: error });
  }
}

function mapGameRow(r: typeof educationalGames.$inferSelect): EducationalGame {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    creatorName: r.creatorName,
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    level: r.level === 'SMP' ? 'SMP' : 'SMA',
    gradeLevel: r.gradeLevel,
    engineType: r.engineType as EducationalGame['engineType'],
    playCount: r.playCount,
    configJson: r.configJson,
    createdAt: r.createdAt,
    isAiGenerated: Boolean(r.isAiGenerated),
    difficulty: (r.difficulty as EducationalGame['difficulty']) || undefined,
  };
}

export async function listGamesPg(): Promise<EducationalGame[]> {
  if (!isPostgresConfigured()) return memoryStore.listGames();
  try {
    await ensurePgSeeded();
    const rows = await db
      .select()
      .from(educationalGames)
      .orderBy(desc(educationalGames.createdAt), desc(educationalGames.playCount));
    return rows.map(mapGameRow);
  } catch (error) {
    console.error('Database query failed in listGamesPg:', error);
    throw new Error('Failed to load games.', { cause: error });
  }
}

export async function getGameBySlugPg(slug: string): Promise<EducationalGame | null> {
  if (!isPostgresConfigured()) return memoryStore.getGameBySlug(slug);
  try {
    await ensurePgSeeded();
    const rows = await db
      .select()
      .from(educationalGames)
      .where(eq(educationalGames.slug, slug))
      .limit(1);
    return rows[0] ? mapGameRow(rows[0]) : null;
  } catch (error) {
    console.error('Database query failed in getGameBySlugPg:', error);
    throw new Error('Failed to load game.', { cause: error });
  }
}

export async function createEducationalGamePg(input: {
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
}): Promise<EducationalGame> {
  if (!isPostgresConfigured()) return memoryStore.createEducationalGame(input);
  try {
    await ensurePgSeeded();
    const id = `game-${crypto.randomUUID().slice(0, 8)}`;
    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const slug = `${slugBase || 'game'}-${crypto.randomUUID().slice(0, 4)}`;
    const createdAt = new Date().toISOString();
    const isAi = Boolean(input.isAiGenerated);

    const [inserted] = await db
      .insert(educationalGames)
      .values({
        id,
        slug,
        title: input.title,
        creatorName: input.creatorName,
        subjectCode: input.subjectCode,
        subjectName: input.subjectName,
        level: input.level,
        gradeLevel: input.gradeLevel,
        engineType: input.engineType,
        playCount: 0,
        configJson: input.configJson,
        createdAt,
        isAiGenerated: isAi,
        difficulty: input.difficulty ?? null,
      })
      .returning();

    return mapGameRow(inserted);
  } catch (error) {
    console.error('Database insert failed in createEducationalGamePg:', error);
    throw new Error('Failed to create educational game.', { cause: error });
  }
}

export async function recordGameSessionPg(input: {
  slug: string;
  studentName: string;
  classroomName: string;
  score: number;
  durationSeconds: number;
  userId?: number;
}): Promise<{ playCount: number }> {
  if (!isPostgresConfigured()) return memoryStore.recordGameSession(input);
  try {
    await ensurePgSeeded();
    const updatedGames = await db
      .update(educationalGames)
      .set({ playCount: sql`${educationalGames.playCount} + 1` })
      .where(eq(educationalGames.slug, input.slug))
      .returning({ playCount: educationalGames.playCount });

    await db.insert(gameSessions).values({
      id: `gs-${crypto.randomUUID().slice(0, 8)}`,
      gameSlug: input.slug,
      userId: input.userId ?? null,
      studentName: input.studentName,
      classroomName: input.classroomName,
      score: input.score,
      durationSeconds: input.durationSeconds,
      completedAt: new Date().toISOString(),
    });

    return { playCount: updatedGames[0]?.playCount ?? 1 };
  } catch (error) {
    console.error('Database update failed in recordGameSessionPg:', error);
    throw new Error('Failed to record game session.', { cause: error });
  }
}

export async function getRecentGameSessionsPg(limit = 10) {
  if (!isPostgresConfigured()) return memoryStore.getRecentGameSessions(limit);
  try {
    await ensurePgSeeded();
    return await db
      .select()
      .from(gameSessions)
      .orderBy(desc(gameSessions.completedAt))
      .limit(limit);
  } catch (error) {
    console.error('Database query failed in getRecentGameSessionsPg:', error);
    throw new Error('Failed to load game sessions.', { cause: error });
  }
}

function mapMaterialRow(r: typeof learningMaterials.$inferSelect): LearningMaterial {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    authorName: r.authorName,
    subjectName: r.subjectName,
    level: r.level === 'SMP' ? 'SMP' : 'SMA',
    gradeLevel: r.gradeLevel,
    materialType: r.materialType as LearningMaterial['materialType'],
    summary: r.summary,
    contentMarkdown: r.contentMarkdown,
    viewsCount: r.viewsCount,
    readMinutes: r.readMinutes,
    createdAt: r.createdAt,
    fileName: r.fileName ?? undefined,
    fileSizeLabel: r.fileSizeLabel ?? undefined,
    pdfDataUrl: r.pdfDataUrl ?? undefined,
  };
}

export async function listMaterialsPg(): Promise<LearningMaterial[]> {
  if (!isPostgresConfigured()) return memoryStore.listMaterials();
  try {
    await ensurePgSeeded();
    const rows = await db
      .select()
      .from(learningMaterials)
      .orderBy(desc(learningMaterials.createdAt), desc(learningMaterials.viewsCount));
    return rows.map(mapMaterialRow);
  } catch (error) {
    console.error('Database query failed in listMaterialsPg:', error);
    throw new Error('Failed to load learning materials.', { cause: error });
  }
}

export async function createLearningMaterialPg(input: {
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
  authorUserId?: number;
}): Promise<LearningMaterial> {
  if (!isPostgresConfigured()) return memoryStore.createLearningMaterial(input);
  try {
    await ensurePgSeeded();
    const id = `mat-${crypto.randomUUID().slice(0, 8)}`;
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 42)}-${crypto.randomUUID().slice(0, 4)}`;
    const createdAt = new Date().toISOString();

    const [inserted] = await db
      .insert(learningMaterials)
      .values({
        id,
        slug,
        authorUserId: input.authorUserId ?? null,
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
        createdAt,
        fileName: input.fileName ?? null,
        fileSizeLabel: input.fileSizeLabel ?? null,
        pdfDataUrl: input.pdfDataUrl ?? null,
      })
      .returning();

    return mapMaterialRow(inserted);
  } catch (error) {
    console.error('Database insert failed in createLearningMaterialPg:', error);
    throw new Error('Failed to create learning material.', { cause: error });
  }
}

export async function incrementMaterialViewPg(slug: string): Promise<number> {
  if (!isPostgresConfigured()) return memoryStore.incrementMaterialView(slug);
  try {
    await ensurePgSeeded();
    const updated = await db
      .update(learningMaterials)
      .set({ viewsCount: sql`${learningMaterials.viewsCount} + 1` })
      .where(eq(learningMaterials.slug, slug))
      .returning({ viewsCount: learningMaterials.viewsCount });
    return updated[0]?.viewsCount ?? 1;
  } catch (error) {
    console.error('Database update failed in incrementMaterialViewPg:', error);
    throw new Error('Failed to update material view count.', { cause: error });
  }
}

function mapAttemptRow(
  r: typeof examAttempts.$inferSelect,
  examTitle = 'UAS Ganjil Informatika',
  subjectName = 'Informatika',
  maxTabSwitches = 3
): ExamAttemptDTO {
  return {
    id: r.id,
    examPacketId: r.examPacketId,
    examTitle,
    subjectName,
    studentName: r.studentName,
    studentNisn: r.studentNisn,
    classroomName: r.classroomName,
    startedAt: r.startedAt,
    expiresAt: r.expiresAt,
    submittedAt: r.submittedAt ?? null,
    answers: JSON.parse(r.answersJson || '{}') as Record<string, string>,
    flaggedIds: JSON.parse(r.flaggedJson || '[]') as string[],
    violationCount: r.violationCount,
    maxTabSwitches,
    violationLogs: JSON.parse(r.violationLogsJson || '[]') as ViolationLogEntry[],
    isLockedByProctor: Boolean(r.isLockedByProctor),
    deviceResetCount: r.deviceResetCount ?? 0,
    finalScore: r.finalScore ?? null,
  };
}

export async function listExamPacketsPg(): Promise<ExamPacketSummary[]> {
  if (!isPostgresConfigured()) return memoryStore.listExamPackets();
  try {
    await ensurePgSeeded();
    const rows = await db.select().from(examPackets);
    return rows.map((r) => {
      const qs = JSON.parse(r.questionsJson) as ServerExamQuestion[];
      return {
        id: r.id,
        title: r.title,
        examType: r.examType as ExamPacketSummary['examType'],
        level: r.gradeLevel <= 9 ? 'SMP' : 'SMA',
        subjectName: r.subjectName,
        gradeLevel: r.gradeLevel,
        durationMinutes: r.durationMinutes,
        maxTabSwitches: r.maxTabSwitches,
        questionCount: qs.length,
        requireSeb: Boolean(r.requireSeb),
      };
    });
  } catch (error) {
    console.error('Database query failed in listExamPacketsPg:', error);
    throw new Error('Failed to load exam packets.', { cause: error });
  }
}

export async function listManageExamPacketsPg(): Promise<
  Array<ExamPacketSummary & { dynamicToken: string; questions: ServerExamQuestion[] }>
> {
  if (!isPostgresConfigured()) return memoryStore.listManageExamPackets();
  try {
    await ensurePgSeeded();
    const rows = await db.select().from(examPackets);
    return rows.map((r) => {
      const qs = JSON.parse(r.questionsJson) as ServerExamQuestion[];
      return {
        id: r.id,
        title: r.title,
        examType: r.examType as ExamPacketSummary['examType'],
        level: r.gradeLevel <= 9 ? 'SMP' : 'SMA',
        subjectName: r.subjectName,
        gradeLevel: r.gradeLevel,
        durationMinutes: r.durationMinutes,
        maxTabSwitches: r.maxTabSwitches,
        questionCount: qs.length,
        requireSeb: Boolean(r.requireSeb),
        dynamicToken: r.dynamicToken,
        questions: qs,
      };
    });
  } catch (error) {
    console.error('Database query failed in listManageExamPacketsPg:', error);
    throw new Error('Failed to load exam packets for management.', { cause: error });
  }
}

export async function createExamPacketPg(input: {
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
}): Promise<ExamPacketSummary & { dynamicToken: string }> {
  if (!isPostgresConfigured()) return memoryStore.createExamPacket(input);
  try {
    await ensurePgSeeded();
    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36);
    const id = input.id?.trim() || `${slugBase || 'cbt'}-${crypto.randomUUID().slice(0, 5)}`;
    const normalizedToken = input.dynamicToken.trim().toUpperCase().slice(0, 8) || 'UJIAN26';

    const existing = await db
      .select({ id: examPackets.id })
      .from(examPackets)
      .where(eq(examPackets.id, id))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(examPackets)
        .set({
          title: input.title,
          examType: input.examType,
          subjectName: input.subjectName,
          gradeLevel: input.gradeLevel,
          durationMinutes: input.durationMinutes,
          maxTabSwitches: input.maxTabSwitches,
          dynamicToken: normalizedToken,
          requireSeb: Boolean(input.requireSeb),
          questionsJson: JSON.stringify(input.questions),
        })
        .where(eq(examPackets.id, id));
    } else {
      await db.insert(examPackets).values({
        id,
        title: input.title,
        examType: input.examType,
        subjectName: input.subjectName,
        gradeLevel: input.gradeLevel,
        durationMinutes: input.durationMinutes,
        maxTabSwitches: input.maxTabSwitches,
        dynamicToken: normalizedToken,
        requireSeb: Boolean(input.requireSeb),
        questionsJson: JSON.stringify(input.questions),
      });
    }

    await insertAuditLogPg({
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
  } catch (error) {
    console.error('Database insert failed in createExamPacketPg:', error);
    throw new Error('Failed to create CBT exam packet.', { cause: error });
  }
}

export async function addQuestionsToExamPacketPg(
  examId: string,
  newQuestions: ServerExamQuestion[],
  actorName = 'Guru Mata Pelajaran'
): Promise<(ExamPacketSummary & { dynamicToken: string; questions: ServerExamQuestion[] }) | null> {
  if (!isPostgresConfigured()) return memoryStore.addQuestionsToExamPacket(examId, newQuestions, actorName);
  try {
    await ensurePgSeeded();
    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, examId))
      .limit(1);
    if (!packet) return null;

    const existing = JSON.parse(packet.questionsJson) as ServerExamQuestion[];
    const merged = [...existing];
    for (const q of newQuestions) {
      if (!merged.some((e) => e.id === q.id)) {
        merged.push(q);
      }
    }

    await db
      .update(examPackets)
      .set({ questionsJson: JSON.stringify(merged) })
      .where(eq(examPackets.id, examId));

    await insertAuditLogPg({
      actorName,
      actorRole: 'TEACHER',
      action: 'UPDATE_CBT_QUESTIONS',
      targetInfo: packet.title,
      oldValue: `${existing.length} soal`,
      newValue: `${merged.length} soal`,
      reason: 'Penambahan butir soal ke bank soal paket ujian CBT',
    });

    return {
      id: packet.id,
      title: packet.title,
      examType: packet.examType as ExamPacketSummary['examType'],
      level: packet.gradeLevel <= 9 ? 'SMP' : 'SMA',
      subjectName: packet.subjectName,
      gradeLevel: packet.gradeLevel,
      durationMinutes: packet.durationMinutes,
      maxTabSwitches: packet.maxTabSwitches,
      questionCount: merged.length,
      requireSeb: Boolean(packet.requireSeb),
      dynamicToken: packet.dynamicToken,
      questions: merged,
    };
  } catch (error) {
    console.error('Database update failed in addQuestionsToExamPacketPg:', error);
    throw new Error('Failed to add questions to CBT exam packet.', { cause: error });
  }
}

export async function getProctorOverviewPg(selectedExamId?: string) {
  if (!isPostgresConfigured()) return memoryStore.getProctorOverview(selectedExamId);
  try {
    await ensurePgSeeded();
    const packets = await db.select().from(examPackets);
    const packetMap = new Map(packets.map((p) => [p.id, p]));
    const packet =
      (selectedExamId ? packetMap.get(selectedExamId) : undefined) || packets[0];

    const attemptsRows = await db
      .select()
      .from(examAttempts)
      .orderBy(desc(examAttempts.isLockedByProctor), examAttempts.studentName);

    const examTitle = packet ? packet.title : 'Ujian CBT';
    const maxTab = packet ? packet.maxTabSwitches : 3;

    return {
      examId: packet ? packet.id : 'uas-informatika-2026',
      examTitle,
      dynamicToken: packet ? packet.dynamicToken : 'UJIAN26',
      maxTabSwitches: maxTab,
      packets: packets.map((p) => {
        const qs = JSON.parse(p.questionsJson) as ServerExamQuestion[];
        return {
          id: p.id,
          title: p.title,
          examType: p.examType as ExamPacketSummary['examType'],
          level: p.gradeLevel <= 9 ? 'SMP' : 'SMA',
          subjectName: p.subjectName,
          gradeLevel: p.gradeLevel,
          durationMinutes: p.durationMinutes,
          maxTabSwitches: p.maxTabSwitches,
          questionCount: qs.length,
          requireSeb: Boolean(p.requireSeb),
          dynamicToken: p.dynamicToken,
        };
      }),
      attempts: attemptsRows.map((r) => {
        const p = packetMap.get(r.examPacketId);
        return mapAttemptRow(
          r,
          p?.title || examTitle,
          p?.subjectName || 'Informatika',
          p?.maxTabSwitches ?? maxTab
        );
      }),
    };
  } catch (error) {
    console.error('Database query failed in getProctorOverviewPg:', error);
    throw new Error('Failed to load proctor overview.', { cause: error });
  }
}

export async function rotateExamTokenPg(examId: string, actorName: string): Promise<string> {
  if (!isPostgresConfigured()) return memoryStore.rotateExamToken(examId, actorName);
  try {
    await ensurePgSeeded();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let nextToken = '';
    for (let i = 0; i < 6; i += 1) {
      nextToken += chars[crypto.randomInt(0, chars.length)];
    }

    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, examId))
      .limit(1);

    await db
      .update(examPackets)
      .set({ dynamicToken: nextToken })
      .where(eq(examPackets.id, examId));

    await insertAuditLogPg({
      actorName,
      actorRole: 'PROCTOR',
      action: 'ROTATE_EXAM_TOKEN',
      targetInfo: packet?.title || examId,
      oldValue: packet?.dynamicToken || null,
      newValue: nextToken,
      reason: 'Rotasi token keamanan ruang ujian CBT',
    });

    return nextToken;
  } catch (error) {
    console.error('Database update failed in rotateExamTokenPg:', error);
    throw new Error('Failed to rotate exam token.', { cause: error });
  }
}

export async function verifyTokenAndGetExamPg(input: {
  examId: string;
  token: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
}): Promise<{ ok: boolean; error?: string; attempt?: ExamAttemptDTO; questions?: ClientExamQuestion[] }> {
  if (!isPostgresConfigured()) return memoryStore.verifyTokenAndGetExam(input);
  try {
    await ensurePgSeeded();
    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, input.examId))
      .limit(1);

    if (!packet) return { ok: false, error: 'Paket ujian tidak ditemukan.' };

    const expectedToken = packet.dynamicToken.trim().toUpperCase();
    if (input.token.trim().toUpperCase() !== expectedToken) {
      return {
        ok: false,
        error: 'Token 6-digit tidak valid. Gunakan token ruang ujian aktif dari Pengawas.',
      };
    }

    let [attemptRow] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examPacketId, input.examId),
          eq(examAttempts.studentNisn, input.studentNisn)
        )
      )
      .limit(1);

    if (!attemptRow) {
      const id = `attempt-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + packet.durationMinutes * 60 * 1000).toISOString();
      const [created] = await db
        .insert(examAttempts)
        .values({
          id,
          examPacketId: input.examId,
          studentName: input.studentName,
          studentNisn: input.studentNisn,
          classroomName: input.classroomName,
          startedAt: now.toISOString(),
          expiresAt,
          submittedAt: null,
          answersJson: '{}',
          flaggedJson: '[]',
          violationCount: 0,
          violationLogsJson: '[]',
          isLockedByProctor: false,
          deviceResetCount: 0,
          finalScore: null,
        })
        .returning();
      attemptRow = created;
    }

    const attempt = mapAttemptRow(attemptRow, packet.title, packet.subjectName, packet.maxTabSwitches);
    const rawQuestions = JSON.parse(packet.questionsJson) as ServerExamQuestion[];
    const seed = `${input.studentNisn}:${input.examId}`;
    const shuffledQuestions = deterministicShuffle(rawQuestions, seed).map((q) => ({
      id: q.id,
      topic: q.topic,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      options: deterministicShuffle(q.options, `${seed}:${q.id}`),
    }));

    return { ok: true, attempt, questions: shuffledQuestions };
  } catch (error) {
    console.error('Database query failed in verifyTokenAndGetExamPg:', error);
    throw new Error('Failed to verify exam token.', { cause: error });
  }
}

export async function getExamSessionForRoomPg(
  examId: string,
  studentNisn: string
): Promise<{ attempt: ExamAttemptDTO; questions: ClientExamQuestion[] } | null> {
  if (!isPostgresConfigured()) return memoryStore.getExamSessionForRoom(examId, studentNisn);
  try {
    await ensurePgSeeded();
    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, examId))
      .limit(1);
    if (!packet) return null;

    const [attemptRow] = await db
      .select()
      .from(examAttempts)
      .where(
        and(eq(examAttempts.examPacketId, examId), eq(examAttempts.studentNisn, studentNisn))
      )
      .limit(1);
    if (!attemptRow) return null;

    const attempt = mapAttemptRow(attemptRow, packet.title, packet.subjectName, packet.maxTabSwitches);
    const rawQuestions = JSON.parse(packet.questionsJson) as ServerExamQuestion[];
    const seed = `${studentNisn}:${examId}`;
    const questions: ClientExamQuestion[] = deterministicShuffle(rawQuestions, seed).map((q) => ({
      id: q.id,
      topic: q.topic,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      options: deterministicShuffle(q.options, `${seed}:${q.id}`),
    }));

    return { attempt, questions };
  } catch (error) {
    console.error('Database query failed in getExamSessionForRoomPg:', error);
    throw new Error('Failed to load exam session.', { cause: error });
  }
}

export async function saveAttemptAnswerPg(
  attemptId: string,
  answers: Record<string, string>,
  flaggedIds: string[]
): Promise<ExamAttemptDTO | null> {
  if (!isPostgresConfigured()) return memoryStore.saveAttemptAnswer(attemptId, answers, flaggedIds);
  try {
    await ensurePgSeeded();
    const [row] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    if (!row) return null;
    if (row.submittedAt || row.isLockedByProctor) {
      return mapAttemptRow(row);
    }
    const [updated] = await db
      .update(examAttempts)
      .set({
        answersJson: JSON.stringify(answers),
        flaggedJson: JSON.stringify(flaggedIds),
      })
      .where(eq(examAttempts.id, attemptId))
      .returning();
    return updated ? mapAttemptRow(updated) : null;
  } catch (error) {
    console.error('Database update failed in saveAttemptAnswerPg:', error);
    throw new Error('Failed to save exam answer.', { cause: error });
  }
}

export async function recordAttemptViolationPg(
  attemptId: string,
  type: ViolationLogEntry['type'],
  detail: string
): Promise<ExamAttemptDTO | null> {
  if (!isPostgresConfigured()) return memoryStore.recordAttemptViolation(attemptId, type, detail);
  try {
    await ensurePgSeeded();
    const [row] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    if (!row || row.submittedAt) return row ? mapAttemptRow(row) : null;

    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, row.examPacketId))
      .limit(1);

    const maxTab = packet?.maxTabSwitches ?? 3;
    const currentCount = row.violationCount;
    const nextCount = currentCount + 1;
    const shouldLock = nextCount >= maxTab ? true : row.isLockedByProctor;

    const logs = JSON.parse(row.violationLogsJson || '[]') as ViolationLogEntry[];
    logs.push({
      timestamp: new Date().toISOString(),
      type,
      detail,
    });

    const [updated] = await db
      .update(examAttempts)
      .set({
        violationCount: nextCount,
        violationLogsJson: JSON.stringify(logs),
        isLockedByProctor: shouldLock,
      })
      .where(eq(examAttempts.id, attemptId))
      .returning();

    if (shouldLock && !row.isLockedByProctor) {
      await insertAuditLogPg({
        actorName: 'Sistem Anti-Cheating CBT',
        actorRole: 'SYSTEM_GUARD',
        action: 'AUTO_LOCK_EXAM',
        targetInfo: `${row.studentName} (${packet?.title || 'CBT'})`,
        oldValue: `violationCount: ${currentCount}`,
        newValue: `violationCount: ${nextCount} (LOCKED)`,
        reason: detail,
      });
    }

    return updated
      ? mapAttemptRow(updated, packet?.title, packet?.subjectName, maxTab)
      : null;
  } catch (error) {
    console.error('Database update failed in recordAttemptViolationPg:', error);
    throw new Error('Failed to record exam violation.', { cause: error });
  }
}

export async function submitExamAttemptPg(attemptId: string): Promise<ExamAttemptDTO | null> {
  if (!isPostgresConfigured()) return memoryStore.submitExamAttempt(attemptId);
  try {
    await ensurePgSeeded();
    const [row] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    if (!row) return null;

    const [packet] = await db
      .select()
      .from(examPackets)
      .where(eq(examPackets.id, row.examPacketId))
      .limit(1);
    if (!packet) return null;

    const questions = JSON.parse(packet.questionsJson) as ServerExamQuestion[];
    const answers = JSON.parse(row.answersJson || '{}') as Record<string, string>;
    const graded = scoreExamAnswers(questions, answers);
    const submittedAt = new Date().toISOString();

    const [updated] = await db
      .update(examAttempts)
      .set({ submittedAt, finalScore: graded.score })
      .where(eq(examAttempts.id, attemptId))
      .returning();

    await insertAuditLogPg({
      actorName: row.studentName,
      actorRole: 'STUDENT',
      action: 'SUBMIT_EXAM',
      targetInfo: packet.title,
      oldValue: 'IN_PROGRESS',
      newValue: `SUBMITTED (Skor: ${graded.score})`,
      reason: `Penyelesaian ujian CBT (${graded.correctCount}/${graded.totalQuestions} benar)`,
    });

    return updated
      ? mapAttemptRow(updated, packet.title, packet.subjectName, packet.maxTabSwitches)
      : null;
  } catch (error) {
    console.error('Database update failed in submitExamAttemptPg:', error);
    throw new Error('Failed to submit exam attempt.', { cause: error });
  }
}

export async function performProctorActionPg(
  attemptId: string,
  action: 'UNLOCK_SESSION' | 'RESET_DEVICE' | 'ADD_TIME_10M',
  actorName: string
): Promise<ExamAttemptDTO | null> {
  if (!isPostgresConfigured()) return memoryStore.performProctorAction(attemptId, action, actorName);
  try {
    await ensurePgSeeded();
    const [row] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    if (!row) return null;

    if (action === 'UNLOCK_SESSION') {
      await db
        .update(examAttempts)
        .set({ isLockedByProctor: false, violationCount: 0 })
        .where(eq(examAttempts.id, attemptId));
      await insertAuditLogPg({
        actorName,
        actorRole: 'PROCTOR',
        action: 'UNLOCK_EXAM_SESSION',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: `LOCKED (${row.violationCount} pelanggaran)`,
        newValue: 'UNLOCKED (0 pelanggaran)',
        reason: 'Verifikasi manual oleh Pengawas Ruang CBT',
      });
    } else if (action === 'RESET_DEVICE') {
      const nextCount = (row.deviceResetCount || 0) + 1;
      await db
        .update(examAttempts)
        .set({ deviceResetCount: nextCount, isLockedByProctor: false })
        .where(eq(examAttempts.id, attemptId));
      await insertAuditLogPg({
        actorName,
        actorRole: 'PROCTOR',
        action: 'RESET_DEVICE_LOGIN',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: `Reset ke-${nextCount - 1}`,
        newValue: `Reset ke-${nextCount} (Perangkat baru diizinkan)`,
        reason: 'Permintaan pindah perangkat / kendala teknis siswa',
      });
    } else if (action === 'ADD_TIME_10M') {
      const oldExp = row.expiresAt;
      const nextExp = new Date(new Date(oldExp).getTime() + 10 * 60 * 1000).toISOString();
      await db
        .update(examAttempts)
        .set({ expiresAt: nextExp })
        .where(eq(examAttempts.id, attemptId));
      await insertAuditLogPg({
        actorName,
        actorRole: 'PROCTOR',
        action: 'ADD_EXAM_TIME_10M',
        targetInfo: `${row.studentName} (${row.classroomName})`,
        oldValue: oldExp,
        newValue: nextExp,
        reason: 'Kompensasi waktu teknis +10 menit',
      });
    }

    const [updated] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);
    return updated ? mapAttemptRow(updated) : null;
  } catch (error) {
    console.error('Database update failed in performProctorActionPg:', error);
    throw new Error('Failed to perform proctor action.', { cause: error });
  }
}

function mapReportCardRow(row: typeof reportCards.$inferSelect): ReportCardDTO {
  return {
    id: row.id,
    studentName: row.studentName,
    studentNisn: row.studentNisn,
    classroomName: row.classroomName,
    academicYear: row.academicYear,
    grades: JSON.parse(row.gradesSnapshotJson),
    attendance: JSON.parse(row.attendanceJson),
    homeroomNote: row.homeroomNote,
    sha256Hash: row.sha256Hash,
    isLocked: Boolean(row.isLocked),
    publishedAt: row.publishedAt,
  };
}

export async function getPrimaryReportCardPg(): Promise<ReportCardDTO> {
  if (!isPostgresConfigured()) return memoryStore.getPrimaryReportCard();
  try {
    await ensurePgSeeded();
    const rows = await db.select().from(reportCards).limit(1);
    return rows[0] ? mapReportCardRow(rows[0]) : SEED_REPORT_CARD;
  } catch (error) {
    console.error('Database query failed in getPrimaryReportCardPg:', error);
    throw new Error('Failed to load report card.', { cause: error });
  }
}

export async function updateGradebookRowPg(
  code: string,
  scores: { dailyGameAvg: number; taskScore: number; utsScore: number; uasScore: number },
  actorName: string
): Promise<ReportCardDTO> {
  if (!isPostgresConfigured()) return memoryStore.updateGradebookRow(code, scores, actorName);
  try {
    const current = await getPrimaryReportCardPg();
    const updatedRows = recalculateGradebookRows(
      current.grades.map((g) => (g.code === code ? { ...g, ...scores } : g))
    );
    const snapshotStr = JSON.stringify(updatedRows);
    const newHash = crypto
      .createHash('sha256')
      .update(`${current.studentNisn}|${current.academicYear}|${snapshotStr}`)
      .digest('hex');

    await db
      .update(reportCards)
      .set({
        gradesSnapshotJson: snapshotStr,
        sha256Hash: newHash,
        publishedAt: new Date().toISOString(),
      })
      .where(eq(reportCards.id, current.id));

    await insertAuditLogPg({
      actorName,
      actorRole: 'TEACHER',
      action: 'UPDATE_FINAL_GRADE',
      targetInfo: `${current.studentName} · Mapel ${code}`,
      oldValue: current.sha256Hash.slice(0, 12),
      newValue: newHash.slice(0, 12),
      reason: 'Pembaruan nilai teragregasi & regenerasi hash SHA-256 E-Rapor',
    });

    return await getPrimaryReportCardPg();
  } catch (error) {
    console.error('Database update failed in updateGradebookRowPg:', error);
    throw new Error('Failed to update gradebook.', { cause: error });
  }
}

export async function verifyReportCardByHashPg(hash: string): Promise<{
  valid: boolean;
  reportCard: ReportCardDTO | null;
  schoolConfig: SchoolConfig;
}> {
  if (!isPostgresConfigured()) return memoryStore.verifyReportCardByHash(hash);
  try {
    await ensurePgSeeded();
    const cfg = await getSchoolConfigPg();
    const rows = await db
      .select()
      .from(reportCards)
      .where(eq(reportCards.sha256Hash, hash))
      .limit(1);
    if (!rows[0]) {
      return { valid: false, reportCard: null, schoolConfig: cfg };
    }
    return {
      valid: true,
      reportCard: mapReportCardRow(rows[0]),
      schoolConfig: cfg,
    };
  } catch (error) {
    console.error('Database query failed in verifyReportCardByHashPg:', error);
    throw new Error('Failed to verify report card hash.', { cause: error });
  }
}

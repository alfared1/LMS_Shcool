import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type {
  SchoolConfig,
  EducationalGame,
  LearningMaterial,
  ServerExamQuestion,
  ClientExamQuestion,
  ExamPacketSummary,
  ExamAttemptDTO,
  ReportCardDTO,
  AuditLogDTO,
  ViolationLogEntry,
} from '../types/lms';
import {
  DEFAULT_SCHOOL_CONFIG,
  SEED_GAMES,
  SEED_MATERIALS,
  SEED_EXAM_QUESTIONS,
  SEED_REPORT_CARD,
  SEED_AUDIT_LOGS,
} from '../lib/seed-data';
import { deterministicShuffle, scoreExamAnswers, recalculateGradebookRows } from '../lib/core-logic';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'cendekia.db');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
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
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    level TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    engine_type TEXT NOT NULL,
    play_count INTEGER NOT NULL DEFAULT 0,
    config_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    game_slug TEXT NOT NULL,
    student_name TEXT NOT NULL,
    classroom_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    completed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learning_materials (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
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
    created_at TEXT NOT NULL
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
    require_seb INTEGER NOT NULL DEFAULT 0,
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
    is_locked_by_proctor INTEGER NOT NULL DEFAULT 0,
    device_reset_count INTEGER NOT NULL DEFAULT 0,
    final_score REAL
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
    sha256_hash TEXT UNIQUE NOT NULL,
    is_locked INTEGER NOT NULL DEFAULT 1,
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

function ensureOptionalColumns(): void {
  const alters = [
    'ALTER TABLE educational_games ADD COLUMN is_ai_generated INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE educational_games ADD COLUMN difficulty TEXT',
    'ALTER TABLE learning_materials ADD COLUMN file_name TEXT',
    'ALTER TABLE learning_materials ADD COLUMN file_size_label TEXT',
    'ALTER TABLE learning_materials ADD COLUMN pdf_data_url TEXT',
  ];
  for (const sql of alters) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists
    }
  }
}

ensureOptionalColumns();

function runInTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function seedDatabaseIfEmpty(): void {
  const existingConfig = db.prepare('SELECT id FROM school_config WHERE id = ?').get('default_tenant');
  if (!existingConfig) {
    db.prepare(`
      INSERT INTO school_config (
        id, school_name, school_short_name, npsn, tagline, address, logo_url,
        principal_name, principal_nip, primary_color_hex, secondary_color_hex,
        accent_color_hex, ai_tutor_name, curriculum_type, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      DEFAULT_SCHOOL_CONFIG.id,
      DEFAULT_SCHOOL_CONFIG.schoolName,
      DEFAULT_SCHOOL_CONFIG.schoolShortName,
      DEFAULT_SCHOOL_CONFIG.npsn,
      DEFAULT_SCHOOL_CONFIG.tagline,
      DEFAULT_SCHOOL_CONFIG.address,
      DEFAULT_SCHOOL_CONFIG.logoUrl,
      DEFAULT_SCHOOL_CONFIG.principalName,
      DEFAULT_SCHOOL_CONFIG.principalNip,
      DEFAULT_SCHOOL_CONFIG.primaryColorHex,
      DEFAULT_SCHOOL_CONFIG.secondaryColorHex,
      DEFAULT_SCHOOL_CONFIG.accentColorHex,
      DEFAULT_SCHOOL_CONFIG.aiTutorName,
      DEFAULT_SCHOOL_CONFIG.curriculumType,
      DEFAULT_SCHOOL_CONFIG.updatedAt
    );
  }

  const gameCountRow = db.prepare('SELECT COUNT(*) as cnt FROM educational_games').get() as { cnt: number };
  if (gameCountRow.cnt === 0) {
    const insertGame = db.prepare(`
      INSERT INTO educational_games (
        id, slug, title, creator_name, subject_code, subject_name,
        level, grade_level, engine_type, play_count, config_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const g of SEED_GAMES) {
      insertGame.run(
        g.id,
        g.slug,
        g.title,
        g.creatorName,
        g.subjectCode,
        g.subjectName,
        g.level,
        g.gradeLevel,
        g.engineType,
        g.playCount,
        g.configJson,
        g.createdAt
      );
    }
  }

  const matCountRow = db.prepare('SELECT COUNT(*) as cnt FROM learning_materials').get() as { cnt: number };
  if (matCountRow.cnt === 0) {
    const insertMat = db.prepare(`
      INSERT INTO learning_materials (
        id, slug, title, author_name, subject_name, level, grade_level,
        material_type, summary, content_markdown, views_count, read_minutes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of SEED_MATERIALS) {
      insertMat.run(
        m.id,
        m.slug,
        m.title,
        m.authorName,
        m.subjectName,
        m.level,
        m.gradeLevel,
        m.materialType,
        m.summary,
        m.contentMarkdown,
        m.viewsCount,
        m.readMinutes,
        m.createdAt
      );
    }
  }

  const examCountRow = db.prepare('SELECT COUNT(*) as cnt FROM exam_packets').get() as { cnt: number };
  if (examCountRow.cnt === 0) {
    db.prepare(`
      INSERT INTO exam_packets (
        id, title, exam_type, subject_name, grade_level, duration_minutes,
        dynamic_token, max_tab_switches, require_seb, questions_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'uas-informatika-2026',
      'Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital',
      'UAS',
      'Informatika & Literasi Digital',
      10,
      60,
      'UJIAN26',
      3,
      0,
      JSON.stringify(SEED_EXAM_QUESTIONS)
    );
  }

  const attemptCountRow = db.prepare('SELECT COUNT(*) as cnt FROM exam_attempts').get() as { cnt: number };
  if (attemptCountRow.cnt === 0) {
    const now = Date.now();
    const in50Min = new Date(now + 50 * 60 * 1000).toISOString();
    const in45Min = new Date(now + 45 * 60 * 1000).toISOString();
    const startedAgo = new Date(now - 10 * 60 * 1000).toISOString();

    const insertAttempt = db.prepare(`
      INSERT INTO exam_attempts (
        id, exam_packet_id, student_name, student_nisn, classroom_name,
        started_at, expires_at, submitted_at, answers_json, flagged_json,
        violation_count, violation_logs_json, is_locked_by_proctor, device_reset_count, final_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Ahmad Fauzi (Active - ready to enter/resume, 0 violations)
    insertAttempt.run(
      'attempt-ahmad-uas26',
      'uas-informatika-2026',
      'Ahmad Fauzi',
      '0084921034',
      'X-IPA-1',
      startedAgo,
      in50Min,
      null,
      JSON.stringify({ 'uas-q1': 'B' }),
      JSON.stringify([]),
      0,
      JSON.stringify([]),
      0,
      0,
      null
    );

    // 2. Siti Nurhaliza (LOCKED - 3/3 tab switch violations for instant Proctor Unlock demo)
    insertAttempt.run(
      'attempt-siti-uas26',
      'uas-informatika-2026',
      'Siti Nurhaliza',
      '0084921088',
      'X-IPA-1',
      startedAgo,
      in45Min,
      null,
      JSON.stringify({ 'uas-q1': 'B', 'uas-q2': 'B' }),
      JSON.stringify(['uas-q3']),
      3,
      JSON.stringify([
        { timestamp: new Date(now - 7 * 60 * 1000).toISOString(), type: 'TAB_SWITCH', detail: 'Berpindah dari jendela ujian (1/3)' },
        { timestamp: new Date(now - 5 * 60 * 1000).toISOString(), type: 'FULLSCREEN_EXIT', detail: 'Keluar dari mode Fullscreen (2/3)' },
        { timestamp: new Date(now - 2 * 60 * 1000).toISOString(), type: 'TAB_SWITCH', detail: 'Batas maksimal pelanggaran tercapai — Terkunci otomatis (3/3)' },
      ]),
      1,
      0,
      null
    );

    // 3. Rizky Ramadhan (Needs device reset)
    insertAttempt.run(
      'attempt-rizky-uas26',
      'uas-informatika-2026',
      'Rizky Ramadhan',
      '0084921102',
      'X-IPA-1',
      startedAgo,
      in45Min,
      null,
      JSON.stringify({ 'uas-q1': 'B', 'uas-q2': 'A', 'uas-q3': 'B' }),
      JSON.stringify([]),
      1,
      JSON.stringify([
        { timestamp: new Date(now - 4 * 60 * 1000).toISOString(), type: 'WINDOW_BLUR', detail: 'Perangkat kehilangan daya / koneksi terputus' },
      ]),
      0,
      0,
      null
    );

    // 4. Dewi Lestari (Completed - 92.5)
    insertAttempt.run(
      'attempt-dewi-uas26',
      'uas-informatika-2026',
      'Dewi Lestari',
      '0084921019',
      'X-IPA-1',
      new Date(now - 45 * 60 * 1000).toISOString(),
      in45Min,
      new Date(now - 6 * 60 * 1000).toISOString(),
      JSON.stringify({ 'uas-q1': 'B', 'uas-q2': 'B', 'uas-q3': 'B', 'uas-q4': 'B', 'uas-q5': 'C' }),
      JSON.stringify([]),
      0,
      JSON.stringify([]),
      0,
      0,
      92.5
    );
  }

  const raporCountRow = db.prepare('SELECT COUNT(*) as cnt FROM report_cards').get() as { cnt: number };
  if (raporCountRow.cnt === 0) {
    db.prepare(`
      INSERT INTO report_cards (
        id, student_name, student_nisn, classroom_name, academic_year,
        grades_snapshot_json, attendance_json, homeroom_note, sha256_hash, is_locked, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      SEED_REPORT_CARD.id,
      SEED_REPORT_CARD.studentName,
      SEED_REPORT_CARD.studentNisn,
      SEED_REPORT_CARD.classroomName,
      SEED_REPORT_CARD.academicYear,
      JSON.stringify(SEED_REPORT_CARD.grades),
      JSON.stringify(SEED_REPORT_CARD.attendance),
      SEED_REPORT_CARD.homeroomNote,
      SEED_REPORT_CARD.sha256Hash,
      1,
      SEED_REPORT_CARD.publishedAt
    );
  }

  const auditCountRow = db.prepare('SELECT COUNT(*) as cnt FROM audit_logs').get() as { cnt: number };
  if (auditCountRow.cnt === 0) {
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (
        id, actor_name, actor_role, action, target_info, old_value, new_value, reason, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const log of SEED_AUDIT_LOGS) {
      insertAudit.run(
        log.id,
        log.actorName,
        log.actorRole,
        log.action,
        log.targetInfo,
        log.oldValue,
        log.newValue,
        log.reason,
        log.ipAddress,
        log.createdAt
      );
    }
  }
}

seedDatabaseIfEmpty();

// --- Query Helpers ---

export function getSchoolConfig(): SchoolConfig {
  const row = db.prepare('SELECT * FROM school_config WHERE id = ?').get('default_tenant') as Record<string, string> | undefined;
  if (!row) return DEFAULT_SCHOOL_CONFIG;
  return {
    id: row.id,
    schoolName: row.school_name,
    schoolShortName: row.school_short_name,
    npsn: row.npsn,
    tagline: row.tagline,
    address: row.address,
    logoUrl: row.logo_url,
    principalName: row.principal_name,
    principalNip: row.principal_nip,
    primaryColorHex: row.primary_color_hex,
    secondaryColorHex: row.secondary_color_hex,
    accentColorHex: row.accent_color_hex,
    aiTutorName: row.ai_tutor_name,
    curriculumType: row.curriculum_type,
    updatedAt: row.updated_at,
  };
}

export function updateSchoolConfig(patch: Partial<SchoolConfig>, actorName = 'Super Admin'): SchoolConfig {
  return runInTransaction(() => {
    const current = getSchoolConfig();
    const next: SchoolConfig = {
      ...current,
      ...patch,
      id: 'default_tenant',
      updatedAt: new Date().toISOString(),
    };

    db.prepare(`
      UPDATE school_config SET
        school_name = ?, school_short_name = ?, npsn = ?, tagline = ?, address = ?,
        logo_url = ?, principal_name = ?, principal_nip = ?, primary_color_hex = ?,
        secondary_color_hex = ?, accent_color_hex = ?, ai_tutor_name = ?, curriculum_type = ?,
        updated_at = ?
      WHERE id = 'default_tenant'
    `).run(
      next.schoolName,
      next.schoolShortName,
      next.npsn,
      next.tagline,
      next.address,
      next.logoUrl,
      next.principalName,
      next.principalNip,
      next.primaryColorHex,
      next.secondaryColorHex,
      next.accentColorHex,
      next.aiTutorName,
      next.curriculumType,
      next.updatedAt
    );

    insertAuditLog({
      actorName,
      actorRole: 'SUPER_ADMIN',
      action: 'UPDATE_WHITE_LABEL',
      targetInfo: next.schoolName,
      oldValue: current.schoolShortName,
      newValue: `${next.schoolShortName} (${next.primaryColorHex})`,
      reason: 'Pembaruan konfigurasi White-Label sekolah',
    });

    return next;
  });
}

export function insertAuditLog(entry: {
  actorName: string;
  actorRole: string;
  action: string;
  targetInfo: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  ipAddress?: string;
}): AuditLogDTO {
  const id = `audit-${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const ipAddress = entry.ipAddress || '127.0.0.1';
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, actor_role, action, target_info, old_value, new_value, reason, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.actorName,
    entry.actorRole,
    entry.action,
    entry.targetInfo,
    entry.oldValue ?? null,
    entry.newValue ?? null,
    entry.reason ?? null,
    ipAddress,
    createdAt
  );
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
}

export function listAuditLogs(limit = 30): AuditLogDTO[] {
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit) as Array<Record<string, string | null>>;
  return rows.map((r) => ({
    id: String(r.id),
    actorName: String(r.actor_name),
    actorRole: String(r.actor_role),
    action: String(r.action),
    targetInfo: String(r.target_info),
    oldValue: r.old_value,
    newValue: r.new_value,
    reason: r.reason,
    ipAddress: String(r.ip_address),
    createdAt: String(r.created_at),
  }));
}

export function listGames(): EducationalGame[] {
  const rows = db.prepare('SELECT * FROM educational_games ORDER BY created_at DESC, play_count DESC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    creatorName: String(r.creator_name),
    subjectCode: String(r.subject_code),
    subjectName: String(r.subject_name),
    level: r.level === 'SMP' ? 'SMP' : 'SMA',
    gradeLevel: Number(r.grade_level),
    engineType: String(r.engine_type) as EducationalGame['engineType'],
    playCount: Number(r.play_count),
    configJson: String(r.config_json),
    createdAt: String(r.created_at),
    isAiGenerated: Boolean(r.is_ai_generated),
    difficulty: (r.difficulty as EducationalGame['difficulty']) || undefined,
  }));
}

export function getGameBySlug(slug: string): EducationalGame | null {
  const r = db.prepare('SELECT * FROM educational_games WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    creatorName: String(r.creator_name),
    subjectCode: String(r.subject_code),
    subjectName: String(r.subject_name),
    level: r.level === 'SMP' ? 'SMP' : 'SMA',
    gradeLevel: Number(r.grade_level),
    engineType: String(r.engine_type) as EducationalGame['engineType'],
    playCount: Number(r.play_count),
    configJson: String(r.config_json),
    createdAt: String(r.created_at),
    isAiGenerated: Boolean(r.is_ai_generated),
    difficulty: (r.difficulty as EducationalGame['difficulty']) || undefined,
  };
}

export function createEducationalGame(input: {
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
  const slug = `${slugBase || 'game'}-${crypto.randomUUID().slice(0, 4)}`;
  const createdAt = new Date().toISOString();
  const isAi = input.isAiGenerated ? 1 : 0;

  db.prepare(`
    INSERT INTO educational_games (
      id, slug, title, creator_name, subject_code, subject_name,
      level, grade_level, engine_type, play_count, config_json, created_at,
      is_ai_generated, difficulty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    input.title,
    input.creatorName,
    input.subjectCode,
    input.subjectName,
    input.level,
    input.gradeLevel,
    input.engineType,
    input.configJson,
    createdAt,
    isAi,
    input.difficulty || null
  );

  return {
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
    isAiGenerated: Boolean(isAi),
    difficulty: input.difficulty,
  };
}

export function recordGameSession(input: {
  slug: string;
  studentName: string;
  classroomName: string;
  score: number;
  durationSeconds: number;
}): { playCount: number } {
  return runInTransaction(() => {
    db.prepare('UPDATE educational_games SET play_count = play_count + 1 WHERE slug = ?').run(input.slug);
    db.prepare(`
      INSERT INTO game_sessions (id, game_slug, student_name, classroom_name, score, duration_seconds, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `gs-${crypto.randomUUID().slice(0, 8)}`,
      input.slug,
      input.studentName,
      input.classroomName,
      input.score,
      input.durationSeconds,
      new Date().toISOString()
    );
    const row = db.prepare('SELECT play_count FROM educational_games WHERE slug = ?').get(input.slug) as { play_count: number } | undefined;
    return { playCount: row?.play_count ?? 1 };
  });
}

export function listMaterials(): LearningMaterial[] {
  const rows = db.prepare('SELECT * FROM learning_materials ORDER BY created_at DESC, views_count DESC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    authorName: String(r.author_name),
    subjectName: String(r.subject_name),
    level: r.level === 'SMP' ? 'SMP' : 'SMA',
    gradeLevel: Number(r.grade_level),
    materialType: String(r.material_type) as LearningMaterial['materialType'],
    summary: String(r.summary),
    contentMarkdown: String(r.content_markdown),
    viewsCount: Number(r.views_count),
    readMinutes: Number(r.read_minutes),
    createdAt: String(r.created_at),
    fileName: r.file_name ? String(r.file_name) : undefined,
    fileSizeLabel: r.file_size_label ? String(r.file_size_label) : undefined,
    pdfDataUrl: r.pdf_data_url ? String(r.pdf_data_url) : undefined,
  }));
}

export function createLearningMaterial(input: {
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
  const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 42)}-${crypto.randomUUID().slice(0, 4)}`;
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO learning_materials (
      id, slug, title, author_name, subject_name, level, grade_level,
      material_type, summary, content_markdown, views_count, read_minutes, created_at,
      file_name, file_size_label, pdf_data_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 8, ?, ?, ?, ?)
  `).run(
    id,
    slug,
    input.title,
    input.authorName,
    input.subjectName,
    input.level,
    input.gradeLevel,
    input.materialType,
    input.summary,
    input.contentMarkdown,
    createdAt,
    input.fileName || null,
    input.fileSizeLabel || null,
    input.pdfDataUrl || null
  );
  return {
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
    createdAt,
    fileName: input.fileName,
    fileSizeLabel: input.fileSizeLabel,
    pdfDataUrl: input.pdfDataUrl,
  };
}

export function incrementMaterialView(slug: string): number {
  db.prepare('UPDATE learning_materials SET views_count = views_count + 1 WHERE slug = ?').run(slug);
  const row = db.prepare('SELECT views_count FROM learning_materials WHERE slug = ?').get(slug) as { views_count: number } | undefined;
  return row?.views_count ?? 1;
}

// --- CBT & Proctor ---

export function listExamPackets(): ExamPacketSummary[] {
  const rows = db.prepare('SELECT * FROM exam_packets').all() as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const qs = JSON.parse(String(r.questions_json)) as ServerExamQuestion[];
    return {
      id: String(r.id),
      title: String(r.title),
      examType: String(r.exam_type) as ExamPacketSummary['examType'],
      subjectName: String(r.subject_name),
      gradeLevel: Number(r.grade_level),
      durationMinutes: Number(r.duration_minutes),
      maxTabSwitches: Number(r.max_tab_switches),
      questionCount: qs.length,
      requireSeb: Boolean(r.require_seb),
    };
  });
}

function mapAttemptRow(r: Record<string, unknown>, examTitle = 'UAS Ganjil Informatika', subjectName = 'Informatika', maxTabSwitches = 3): ExamAttemptDTO {
  return {
    id: String(r.id),
    examPacketId: String(r.exam_packet_id),
    examTitle,
    subjectName,
    studentName: String(r.student_name),
    studentNisn: String(r.student_nisn),
    classroomName: String(r.classroom_name),
    startedAt: String(r.started_at),
    expiresAt: String(r.expires_at),
    submittedAt: r.submitted_at ? String(r.submitted_at) : null,
    answers: JSON.parse(String(r.answers_json || '{}')) as Record<string, string>,
    flaggedIds: JSON.parse(String(r.flagged_json || '[]')) as string[],
    violationCount: Number(r.violation_count),
    maxTabSwitches,
    violationLogs: JSON.parse(String(r.violation_logs_json || '[]')) as ViolationLogEntry[],
    isLockedByProctor: Boolean(r.is_locked_by_proctor),
    deviceResetCount: Number(r.device_reset_count || 0),
    finalScore: r.final_score !== null && r.final_score !== undefined ? Number(r.final_score) : null,
  };
}

export function getProctorOverview() {
  const packet = db.prepare('SELECT * FROM exam_packets LIMIT 1').get() as Record<string, unknown> | undefined;
  const attemptsRows = db.prepare('SELECT * FROM exam_attempts ORDER BY is_locked_by_proctor DESC, student_name ASC').all() as Array<Record<string, unknown>>;
  const examTitle = packet ? String(packet.title) : 'Ujian CBT';
  const subjectName = packet ? String(packet.subject_name) : 'Informatika';
  const maxTab = packet ? Number(packet.max_tab_switches) : 3;

  return {
    examId: packet ? String(packet.id) : 'uas-informatika-2026',
    examTitle,
    dynamicToken: packet ? String(packet.dynamic_token) : 'UJIAN26',
    maxTabSwitches: maxTab,
    attempts: attemptsRows.map((r) => mapAttemptRow(r, examTitle, subjectName, maxTab)),
  };
}

export function rotateExamToken(examId: string, actorName: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let nextToken = '';
  for (let i = 0; i < 6; i += 1) {
    nextToken += chars[crypto.randomInt(0, chars.length)];
  }
  return runInTransaction(() => {
    const packet = db.prepare('SELECT dynamic_token, title FROM exam_packets WHERE id = ?').get(examId) as { dynamic_token: string; title: string } | undefined;
    db.prepare('UPDATE exam_packets SET dynamic_token = ? WHERE id = ?').run(nextToken, examId);
    insertAuditLog({
      actorName,
      actorRole: 'PROCTOR',
      action: 'ROTATE_EXAM_TOKEN',
      targetInfo: packet?.title || examId,
      oldValue: packet?.dynamic_token || null,
      newValue: nextToken,
      reason: 'Rotasi token keamanan ruang ujian CBT',
    });
    return nextToken;
  });
}

export function verifyTokenAndGetExam(input: {
  examId: string;
  token: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
}): { ok: boolean; error?: string; attempt?: ExamAttemptDTO; questions?: ClientExamQuestion[] } {
  const packet = db.prepare('SELECT * FROM exam_packets WHERE id = ?').get(input.examId) as Record<string, unknown> | undefined;
  if (!packet) return { ok: false, error: 'Paket ujian tidak ditemukan.' };

  const expectedToken = String(packet.dynamic_token).trim().toUpperCase();
  if (input.token.trim().toUpperCase() !== expectedToken) {
    return { ok: false, error: `Token 6-digit tidak valid. Gunakan token ruang ujian aktif dari Pengawas.` };
  }

  const maxTab = Number(packet.max_tab_switches);
  let attemptRow = db
    .prepare('SELECT * FROM exam_attempts WHERE exam_packet_id = ? AND student_nisn = ?')
    .get(input.examId, input.studentNisn) as Record<string, unknown> | undefined;

  if (!attemptRow) {
    const id = `attempt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(packet.duration_minutes) * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO exam_attempts (
        id, exam_packet_id, student_name, student_nisn, classroom_name,
        started_at, expires_at, submitted_at, answers_json, flagged_json,
        violation_count, violation_logs_json, is_locked_by_proctor, device_reset_count, final_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, '{}', '[]', 0, '[]', 0, 0, NULL)
    `).run(id, input.examId, input.studentName, input.studentNisn, input.classroomName, now.toISOString(), expiresAt);
    attemptRow = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(id) as Record<string, unknown>;
  }

  const attempt = mapAttemptRow(attemptRow, String(packet.title), String(packet.subject_name), maxTab);
  const rawQuestions = JSON.parse(String(packet.questions_json)) as ServerExamQuestion[];

  // Deterministic shuffle by studentNisn + examId, AND strip correctOptionId!
  const seed = `${input.studentNisn}:${input.examId}`;
  const shuffledQuestions = deterministicShuffle(rawQuestions, seed).map((q) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.questionText,
    options: deterministicShuffle(q.options, `${seed}:${q.id}`),
  }));

  return { ok: true, attempt, questions: shuffledQuestions };
}

export function getExamSessionForRoom(examId: string, studentNisn: string): { attempt: ExamAttemptDTO; questions: ClientExamQuestion[] } | null {
  const packet = db.prepare('SELECT * FROM exam_packets WHERE id = ?').get(examId) as Record<string, unknown> | undefined;
  if (!packet) return null;

  const attemptRow = db
    .prepare('SELECT * FROM exam_attempts WHERE exam_packet_id = ? AND student_nisn = ?')
    .get(examId, studentNisn) as Record<string, unknown> | undefined;
  if (!attemptRow) return null;

  const maxTab = Number(packet.max_tab_switches);
  const attempt = mapAttemptRow(attemptRow, String(packet.title), String(packet.subject_name), maxTab);
  const rawQuestions = JSON.parse(String(packet.questions_json)) as ServerExamQuestion[];
  const seed = `${studentNisn}:${examId}`;
  const questions: ClientExamQuestion[] = deterministicShuffle(rawQuestions, seed).map((q) => ({
    id: q.id,
    topic: q.topic,
    questionText: q.questionText,
    options: deterministicShuffle(q.options, `${seed}:${q.id}`),
  }));

  return { attempt, questions };
}

export function saveAttemptAnswer(attemptId: string, answers: Record<string, string>, flaggedIds: string[]): ExamAttemptDTO | null {
  const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (row.submitted_at || row.is_locked_by_proctor) {
    return mapAttemptRow(row);
  }
  db.prepare('UPDATE exam_attempts SET answers_json = ?, flagged_json = ? WHERE id = ?').run(
    JSON.stringify(answers),
    JSON.stringify(flaggedIds),
    attemptId
  );
  const updated = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown>;
  return mapAttemptRow(updated);
}

export function recordAttemptViolation(attemptId: string, type: ViolationLogEntry['type'], detail: string): ExamAttemptDTO | null {
  return runInTransaction(() => {
    const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown> | undefined;
    if (!row || row.submitted_at) return row ? mapAttemptRow(row) : null;

    const packet = db.prepare('SELECT max_tab_switches, title FROM exam_packets WHERE id = ?').get(String(row.exam_packet_id)) as { max_tab_switches: number; title: string } | undefined;
    const maxTab = packet?.max_tab_switches ?? 3;
    const currentCount = Number(row.violation_count);
    const nextCount = currentCount + 1;
    const shouldLock = nextCount >= maxTab ? 1 : Number(row.is_locked_by_proctor);

    const logs = JSON.parse(String(row.violation_logs_json || '[]')) as ViolationLogEntry[];
    logs.push({
      timestamp: new Date().toISOString(),
      type,
      detail,
    });

    db.prepare(`
      UPDATE exam_attempts
      SET violation_count = ?, violation_logs_json = ?, is_locked_by_proctor = ?
      WHERE id = ?
    `).run(nextCount, JSON.stringify(logs), shouldLock, attemptId);

    if (shouldLock && !row.is_locked_by_proctor) {
      insertAuditLog({
        actorName: 'Sistem Anti-Cheating CBT',
        actorRole: 'SYSTEM_GUARD',
        action: 'AUTO_LOCK_EXAM',
        targetInfo: `${String(row.student_name)} (${packet?.title || 'CBT'})`,
        oldValue: `violationCount: ${currentCount}`,
        newValue: `violationCount: ${nextCount} (LOCKED)`,
        reason: detail,
      });
    }

    const updated = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown>;
    return mapAttemptRow(updated, packet?.title, 'Informatika', maxTab);
  });
}

export function submitExamAttempt(attemptId: string): ExamAttemptDTO | null {
  return runInTransaction(() => {
    const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const packet = db.prepare('SELECT * FROM exam_packets WHERE id = ?').get(String(row.exam_packet_id)) as Record<string, unknown> | undefined;
    if (!packet) return null;

    const questions = JSON.parse(String(packet.questions_json)) as ServerExamQuestion[];
    const answers = JSON.parse(String(row.answers_json || '{}')) as Record<string, string>;
    const graded = scoreExamAnswers(questions, answers);
    const submittedAt = new Date().toISOString();

    db.prepare('UPDATE exam_attempts SET submitted_at = ?, final_score = ? WHERE id = ?').run(
      submittedAt,
      graded.score,
      attemptId
    );

    insertAuditLog({
      actorName: String(row.student_name),
      actorRole: 'STUDENT',
      action: 'SUBMIT_EXAM',
      targetInfo: String(packet.title),
      oldValue: 'IN_PROGRESS',
      newValue: `SUBMITTED (Skor: ${graded.score})`,
      reason: `Penyelesaian ujian CBT (${graded.correctCount}/${graded.totalQuestions} benar)`,
    });

    const updated = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown>;
    return mapAttemptRow(updated, String(packet.title), String(packet.subject_name), Number(packet.max_tab_switches));
  });
}

export function performProctorAction(
  attemptId: string,
  action: 'UNLOCK_SESSION' | 'RESET_DEVICE' | 'ADD_TIME_10M',
  actorName: string
): ExamAttemptDTO | null {
  return runInTransaction(() => {
    const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const studentName = String(row.student_name);

    if (action === 'UNLOCK_SESSION') {
      db.prepare('UPDATE exam_attempts SET is_locked_by_proctor = 0, violation_count = 0 WHERE id = ?').run(attemptId);
      insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'UNLOCK_EXAM_SESSION',
        targetInfo: `${studentName} (${String(row.classroom_name)})`,
        oldValue: `LOCKED (${String(row.violation_count)} pelanggaran)`,
        newValue: 'UNLOCKED (0 pelanggaran)',
        reason: 'Verifikasi manual oleh Pengawas Ruang CBT',
      });
    } else if (action === 'RESET_DEVICE') {
      const nextCount = Number(row.device_reset_count || 0) + 1;
      db.prepare('UPDATE exam_attempts SET device_reset_count = ?, is_locked_by_proctor = 0 WHERE id = ?').run(nextCount, attemptId);
      insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'RESET_DEVICE_LOGIN',
        targetInfo: `${studentName} (${String(row.classroom_name)})`,
        oldValue: `Reset ke-${nextCount - 1}`,
        newValue: `Reset ke-${nextCount} (Perangkat baru diizinkan)`,
        reason: 'Permintaan pindah perangkat / kendala teknis siswa',
      });
    } else if (action === 'ADD_TIME_10M') {
      const oldExp = String(row.expires_at);
      const nextExp = new Date(new Date(oldExp).getTime() + 10 * 60 * 1000).toISOString();
      db.prepare('UPDATE exam_attempts SET expires_at = ? WHERE id = ?').run(nextExp, attemptId);
      insertAuditLog({
        actorName,
        actorRole: 'PROCTOR',
        action: 'ADD_EXAM_TIME_10M',
        targetInfo: `${studentName} (${String(row.classroom_name)})`,
        oldValue: oldExp,
        newValue: nextExp,
        reason: 'Kompensasi waktu teknis +10 menit',
      });
    }

    const updated = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(attemptId) as Record<string, unknown>;
    return mapAttemptRow(updated);
  });
}

export function hasActiveExamLockout(studentNisn = '0084921034'): boolean {
  const row = db
    .prepare('SELECT expires_at, submitted_at, is_locked_by_proctor FROM exam_attempts WHERE student_nisn = ? LIMIT 1')
    .get(studentNisn) as { expires_at: string; submitted_at: string | null; is_locked_by_proctor: number } | undefined;

  if (!row) return false;
  if (row.submitted_at) return false;
  // Lock out AI Tutor if an unsubmitted active CBT attempt has not expired (except when demoing before entering? No: specifically check if student actually entered/started or active in room; we pass explicit header or check active flag from client + DB!)
  return new Date(row.expires_at).getTime() > Date.now();
}

// --- E-Rapor & Verification ---

export function getPrimaryReportCard(): ReportCardDTO {
  const row = db.prepare('SELECT * FROM report_cards LIMIT 1').get() as Record<string, unknown> | undefined;
  if (!row) return SEED_REPORT_CARD;
  return {
    id: String(row.id),
    studentName: String(row.student_name),
    studentNisn: String(row.student_nisn),
    classroomName: String(row.classroom_name),
    academicYear: String(row.academic_year),
    grades: JSON.parse(String(row.grades_snapshot_json)),
    attendance: JSON.parse(String(row.attendance_json)),
    homeroomNote: String(row.homeroom_note),
    sha256Hash: String(row.sha256_hash),
    isLocked: Boolean(row.is_locked),
    publishedAt: String(row.published_at),
  };
}

export function updateGradebookRow(
  code: string,
  scores: { dailyGameAvg: number; taskScore: number; utsScore: number; uasScore: number },
  actorName: string
): ReportCardDTO {
  return runInTransaction(() => {
    const current = getPrimaryReportCard();
    const updatedRows = recalculateGradebookRows(
      current.grades.map((g) => (g.code === code ? { ...g, ...scores } : g))
    );
    const snapshotStr = JSON.stringify(updatedRows);
    const newHash = crypto
      .createHash('sha256')
      .update(`${current.studentNisn}|${current.academicYear}|${snapshotStr}`)
      .digest('hex');

    db.prepare('UPDATE report_cards SET grades_snapshot_json = ?, sha256_hash = ?, published_at = ? WHERE id = ?').run(
      snapshotStr,
      newHash,
      new Date().toISOString(),
      current.id
    );

    insertAuditLog({
      actorName,
      actorRole: 'TEACHER',
      action: 'UPDATE_FINAL_GRADE',
      targetInfo: `${current.studentName} · Mapel ${code}`,
      oldValue: current.sha256Hash.slice(0, 12),
      newValue: newHash.slice(0, 12),
      reason: 'Pembaruan nilai teragregasi & regenerasi hash SHA-256 E-Rapor',
    });

    return getPrimaryReportCard();
  });
}

export function verifyReportCardByHash(hash: string): {
  valid: boolean;
  reportCard: ReportCardDTO | null;
  schoolConfig: SchoolConfig;
} {
  const schoolConfig = getSchoolConfig();
  const row = db.prepare('SELECT * FROM report_cards WHERE sha256_hash = ?').get(hash) as Record<string, unknown> | undefined;
  if (!row) {
    return { valid: false, reportCard: null, schoolConfig };
  }
  return {
    valid: true,
    reportCard: {
      id: String(row.id),
      studentName: String(row.student_name),
      studentNisn: String(row.student_nisn),
      classroomName: String(row.classroom_name),
      academicYear: String(row.academic_year),
      grades: JSON.parse(String(row.grades_snapshot_json)),
      attendance: JSON.parse(String(row.attendance_json)),
      homeroomNote: String(row.homeroom_note),
      sha256Hash: String(row.sha256_hash),
      isLocked: Boolean(row.is_locked),
      publishedAt: String(row.published_at),
    },
    schoolConfig,
  };
}

export function getRecentGameSessions(limit = 10) {
  return db.prepare('SELECT * FROM game_sessions ORDER BY completed_at DESC LIMIT ?').all(limit);
}

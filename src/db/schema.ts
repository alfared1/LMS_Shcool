import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('STUDENT'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const schoolConfig = pgTable('school_config', {
  id: text('id').primaryKey(),
  schoolName: text('school_name').notNull(),
  schoolShortName: text('school_short_name').notNull(),
  npsn: text('npsn').notNull(),
  tagline: text('tagline').notNull(),
  address: text('address').notNull(),
  logoUrl: text('logo_url').notNull(),
  principalName: text('principal_name').notNull(),
  principalNip: text('principal_nip').notNull(),
  primaryColorHex: text('primary_color_hex').notNull(),
  secondaryColorHex: text('secondary_color_hex').notNull(),
  accentColorHex: text('accent_color_hex').notNull(),
  aiTutorName: text('ai_tutor_name').notNull(),
  curriculumType: text('curriculum_type').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const educationalGames = pgTable('educational_games', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  creatorName: text('creator_name').notNull(),
  subjectCode: text('subject_code').notNull(),
  subjectName: text('subject_name').notNull(),
  level: text('level').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  engineType: text('engine_type').notNull(),
  playCount: integer('play_count').notNull().default(0),
  configJson: text('config_json').notNull(),
  createdAt: text('created_at').notNull(),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  difficulty: text('difficulty'),
});

export const gameSessions = pgTable('game_sessions', {
  id: text('id').primaryKey(),
  gameSlug: text('game_slug').notNull(),
  userId: integer('user_id').references(() => users.id),
  studentName: text('student_name').notNull(),
  classroomName: text('classroom_name').notNull(),
  score: integer('score').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  completedAt: text('completed_at').notNull(),
});

export const learningMaterials = pgTable('learning_materials', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  authorUserId: integer('author_user_id').references(() => users.id),
  title: text('title').notNull(),
  authorName: text('author_name').notNull(),
  subjectName: text('subject_name').notNull(),
  level: text('level').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  materialType: text('material_type').notNull(),
  summary: text('summary').notNull(),
  contentMarkdown: text('content_markdown').notNull(),
  viewsCount: integer('views_count').notNull().default(0),
  readMinutes: integer('read_minutes').notNull().default(5),
  createdAt: text('created_at').notNull(),
  fileName: text('file_name'),
  fileSizeLabel: text('file_size_label'),
  pdfDataUrl: text('pdf_data_url'),
});

export const examPackets = pgTable('exam_packets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  examType: text('exam_type').notNull(),
  subjectName: text('subject_name').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  dynamicToken: text('dynamic_token').notNull(),
  maxTabSwitches: integer('max_tab_switches').notNull().default(3),
  requireSeb: boolean('require_seb').notNull().default(false),
  questionsJson: text('questions_json').notNull(),
});

export const examAttempts = pgTable('exam_attempts', {
  id: text('id').primaryKey(),
  examPacketId: text('exam_packet_id').notNull(),
  studentName: text('student_name').notNull(),
  studentNisn: text('student_nisn').notNull(),
  classroomName: text('classroom_name').notNull(),
  startedAt: text('started_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  submittedAt: text('submitted_at'),
  answersJson: text('answers_json').notNull().default('{}'),
  flaggedJson: text('flagged_json').notNull().default('[]'),
  violationCount: integer('violation_count').notNull().default(0),
  violationLogsJson: text('violation_logs_json').notNull().default('[]'),
  isLockedByProctor: boolean('is_locked_by_proctor').notNull().default(false),
  deviceResetCount: integer('device_reset_count').notNull().default(0),
  finalScore: doublePrecision('final_score'),
});

export const reportCards = pgTable('report_cards', {
  id: text('id').primaryKey(),
  studentName: text('student_name').notNull(),
  studentNisn: text('student_nisn').notNull(),
  classroomName: text('classroom_name').notNull(),
  academicYear: text('academic_year').notNull(),
  gradesSnapshotJson: text('grades_snapshot_json').notNull(),
  attendanceJson: text('attendance_json').notNull(),
  homeroomNote: text('homeroom_note').notNull(),
  sha256Hash: text('sha256_hash').notNull().unique(),
  isLocked: boolean('is_locked').notNull().default(true),
  publishedAt: text('published_at').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetInfo: text('target_info').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  reason: text('reason'),
  ipAddress: text('ip_address').notNull(),
  createdAt: text('created_at').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  gameSessions: many(gameSessions),
  learningMaterials: many(learningMaterials),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  user: one(users, {
    fields: [gameSessions.userId],
    references: [users.id],
  }),
}));

export const learningMaterialsRelations = relations(learningMaterials, ({ one }) => ({
  author: one(users, {
    fields: [learningMaterials.authorUserId],
    references: [users.id],
  }),
}));

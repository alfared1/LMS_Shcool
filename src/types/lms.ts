export type DemoRole = 'TEACHER' | 'STUDENT' | 'SCHOOL_ADMIN' | 'OPERATIONAL' | 'PARENT';

export type LanguageCode = 'id' | 'en';

export interface AuthSession {
  isAuthenticated: boolean;
  role: DemoRole;
  username: string;
  displayName: string;
  email: string;
  loggedInAt: string;
}

export type GameEngineType =
  | 'MILLIONAIRE_QUIZ'
  | 'IFP_TOWER_BATTLE'
  | 'SWIPE_CARD'
  | 'ROLEPLAY_LKPD'
  | 'TURN_BASED_ARENA';

export interface SchoolConfig {
  id: string;
  schoolName: string;
  schoolShortName: string;
  npsn: string;
  tagline: string;
  address: string;
  logoUrl: string;
  principalName: string;
  principalNip: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  accentColorHex: string;
  aiTutorName: string;
  curriculumType: string;
  updatedAt: string;
}

export interface EducationalGame {
  id: string;
  slug: string;
  title: string;
  creatorName: string;
  subjectCode: string;
  subjectName: string;
  level: 'SMP' | 'SMA';
  gradeLevel: number;
  engineType: GameEngineType;
  playCount: number;
  configJson: string;
  createdAt: string;
  isAiGenerated?: boolean;
  difficulty?: 'Mudah' | 'Sedang' | 'HOTS';
}

export interface LearningMaterial {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  subjectName: string;
  level: 'SMP' | 'SMA';
  gradeLevel: number;
  materialType: 'MODUL_PDF' | 'INTERACTIVE_LKPD' | 'ARTICLE_BLOG';
  summary: string;
  contentMarkdown: string;
  viewsCount: number;
  readMinutes: number;
  createdAt: string;
  pdfDataUrl?: string;
  pdfObjectUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileSizeLabel?: string;
}

export interface ExamOption {
  id: string;
  text: string;
}

export interface ClientExamQuestion {
  id: string;
  questionText: string;
  topic: string;
  options: ExamOption[];
}

export interface ServerExamQuestion extends ClientExamQuestion {
  correctOptionId: string;
  weight: number;
}

export interface ExamPacketSummary {
  id: string;
  title: string;
  examType: 'UTS' | 'UAS' | 'USBN';
  subjectName: string;
  gradeLevel: number;
  durationMinutes: number;
  maxTabSwitches: number;
  questionCount: number;
  requireSeb: boolean;
}

export interface ViolationLogEntry {
  timestamp: string;
  type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'WINDOW_BLUR';
  detail: string;
}

export interface ExamAttemptDTO {
  id: string;
  examPacketId: string;
  examTitle: string;
  subjectName: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  answers: Record<string, string>;
  flaggedIds: string[];
  violationCount: number;
  maxTabSwitches: number;
  violationLogs: ViolationLogEntry[];
  isLockedByProctor: boolean;
  deviceResetCount: number;
  finalScore: number | null;
}

export interface SubjectGradeRow {
  code: string;
  name: string;
  kkm: number;
  dailyGameAvg: number;
  taskScore: number;
  utsScore: number;
  uasScore: number;
  finalGrade: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  teacherNote: string;
}

export interface ReportCardDTO {
  id: string;
  studentName: string;
  studentNisn: string;
  classroomName: string;
  academicYear: string;
  grades: SubjectGradeRow[];
  attendance: {
    sick: number;
    permit: number;
    alpha: number;
  };
  homeroomNote: string;
  sha256Hash: string;
  isLocked: boolean;
  publishedAt: string;
}

export interface AuditLogDTO {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetInfo: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  ipAddress: string;
  createdAt: string;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deterministicShuffle,
  hexToHslComponents,
  calculateFinalGrade,
  scoreExamAnswers,
  checkPasswordEntropy,
  validateVaultPassword,
  formatCountdown,
} from './core-logic';
import type { ServerExamQuestion, GameEngineType } from '../types/lms';
import { authenticateDemoAccount, DEMO_ACCOUNT_LIST, resolveSafeRole } from './auth-users';
import { formatFileSize } from './pdf-helper';
import { generateSmartGameConfig } from './ai-game-generator';
import {
  buildQuestionTemplateFile,
  generateExamToken6,
  generateHotsCbtQuestions,
  parseQuestionBankFile,
} from './cbt-bank-parser';
import {
  isPostgresConfigured,
  resolvePostgresPoolConfig,
  shouldUseSslForConnectionString,
} from './db-config';

test('deterministicShuffle produces stable output for same seed and different for different seeds', () => {
  const items = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
  const a1 = deterministicShuffle(items, 'student-ahmad:uas-2026');
  const a2 = deterministicShuffle(items, 'student-ahmad:uas-2026');
  const b1 = deterministicShuffle(items, 'student-siti:uas-2026');

  assert.deepEqual(a1, a2);
  assert.equal(a1.length, items.length);
  assert.notDeepEqual(a1, b1);
});

test('hexToHslComponents converts emerald hex and picks white foreground', () => {
  const emerald = hexToHslComponents('#059669');
  assert.equal(emerald.h, 161);
  assert.equal(emerald.fgString, '0 0% 100%');

  const brightYellow = hexToHslComponents('#fde047');
  assert.equal(brightYellow.fgString, '222 47% 11%');
});

test('calculateFinalGrade applies 20/20/25/35 weights and assigns predicate', () => {
  const res = calculateFinalGrade({
    dailyGameAvg: 90,
    taskScore: 85,
    utsScore: 80,
    uasScore: 92,
  });
  // 18 + 17 + 20 + 32.2 = 87.2
  assert.equal(res.finalGrade, 87.2);
  assert.equal(res.predicate, 'B');
  assert.equal(res.passedKkm, true);

  const high = calculateFinalGrade({
    dailyGameAvg: 95,
    taskScore: 92,
    utsScore: 90,
    uasScore: 94,
  });
  assert.equal(high.predicate, 'A');
});

test('scoreExamAnswers grades server questions accurately', () => {
  const questions: ServerExamQuestion[] = [
    {
      id: 'q1',
      topic: 'Algoritma',
      questionText: 'Test 1',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
      ],
      correctOptionId: 'A',
      weight: 1,
    },
    {
      id: 'q2',
      topic: 'Keamanan',
      questionText: 'Test 2',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
      ],
      correctOptionId: 'B',
      weight: 1,
    },
  ];

  const graded = scoreExamAnswers(questions, { q1: 'A', q2: 'A' });
  assert.equal(graded.correctCount, 1);
  assert.equal(graded.totalQuestions, 2);
  assert.equal(graded.score, 50);
});

test('password entropy and vault regex validator enforce cybersecurity rules', () => {
  const weak = checkPasswordEntropy('123456');
  assert.equal(weak.label, 'Sangat Lemah');

  const invalidVault = validateVaultPassword('cendekia123');
  assert.equal(invalidVault.isValid, false);
  assert.equal(invalidVault.checks.hasUppercase, false);
  assert.equal(invalidVault.checks.hasSymbol, false);

  const validVault = validateVaultPassword('Cendekia#2026!');
  assert.equal(validVault.isValid, true);
});

test('formatCountdown formats HH:MM:SS cleanly', () => {
  assert.equal(formatCountdown(3661), '01:01:01');
  assert.equal(formatCountdown(-5), '00:00:00');
});

test('multi-role auth supports all 5 roles and rejects wrong credentials', () => {
  assert.equal(DEMO_ACCOUNT_LIST.length, 5);
  const teacher = authenticateDemoAccount('guru.hendra', 'Guru2026!');
  assert.equal(teacher?.role, 'TEACHER');

  const parent = authenticateDemoAccount('wali.fauzi', 'Wali2026!');
  assert.equal(parent?.role, 'PARENT');

  const invalid = authenticateDemoAccount('guru.hendra', 'salah');
  assert.equal(invalid, null);

  assert.equal(resolveSafeRole('PROCTOR'), 'OPERATIONAL');
  assert.equal(resolveSafeRole('SUPER_ADMIN'), 'SCHOOL_ADMIN');
});

test('formatFileSize formats bytes cleanly into KB and MB', () => {
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2.00 MB');
});

test('generateSmartGameConfig produces valid engine schemas for all 5 game engines', () => {
  const engines: GameEngineType[] = [
    'MILLIONAIRE_QUIZ',
    'SWIPE_CARD',
    'IFP_TOWER_BATTLE',
    'TURN_BASED_ARENA',
    'ROLEPLAY_LKPD',
  ];
  for (const engineType of engines) {
    const result = generateSmartGameConfig({
      prompt: 'Fotosintesis pada tumbuhan hijau dan reaksi terang klorofil',
      engineType,
      level: 'SMA',
      gradeLevel: 11,
      subjectName: 'Biologi',
      difficulty: 'Sedang',
    });
    assert.ok(result.title.length > 5);
    assert.ok(result.config && typeof result.config === 'object');
    if (engineType === 'MILLIONAIRE_QUIZ' || engineType === 'TURN_BASED_ARENA') {
      assert.ok(Array.isArray((result.config as { questions: unknown[] }).questions));
      assert.ok((result.config as { questions: unknown[] }).questions.length >= 4);
    }
    if (engineType === 'SWIPE_CARD') {
      assert.ok(Array.isArray((result.config as { cards: unknown[] }).cards));
    }
    if (engineType === 'IFP_TOWER_BATTLE') {
      assert.ok(Array.isArray((result.config as { prompts: unknown[] }).prompts));
    }
    if (engineType === 'ROLEPLAY_LKPD') {
      assert.ok(Array.isArray((result.config as { phishingCases: unknown[] }).phishingCases));
    }
  }
});

test('cbt-bank-parser parses CSV, JSON, and TXT templates accurately and generates 5 HOTS questions', () => {
  const token = generateExamToken6('Matematika');
  assert.equal(token.length, 6);
  assert.ok(token.startsWith('MAT'));

  for (const fmt of ['csv', 'json', 'txt'] as const) {
    const tpl = buildQuestionTemplateFile(fmt, 'Matematika');
    const parsed = parseQuestionBankFile(tpl.content, tpl.fileName);
    assert.equal(parsed.format, fmt);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.questions.length, 2);
    assert.equal(parsed.questions[0].options.length, 5);
    assert.ok(['A', 'B', 'C', 'D', 'E'].includes(parsed.questions[0].correctOptionId));
  }

  const hots = generateHotsCbtQuestions({
    subjectName: 'Matematika',
    level: 'SMA',
    gradeLevel: 10,
  });
  assert.equal(hots.length, 5);
  assert.equal(hots[0].options.length, 5);
});

test('db-config resolves Vercel DATABASE_URL/POSTGRES_URL, Cloud SQL host vars, and fallback cleanly', () => {
  assert.equal(isPostgresConfigured({}), false);
  assert.equal(resolvePostgresPoolConfig({}).mode, 'none');

  const neon = resolvePostgresPoolConfig({
    DATABASE_URL: 'postgresql://user:pass@ep-cool-rain.us-east-2.aws.neon.tech/neondb?sslmode=require',
  });
  assert.equal(neon.configured, true);
  assert.equal(neon.mode, 'connectionString');
  assert.deepEqual(neon.ssl, { rejectUnauthorized: false });

  const localUrl = shouldUseSslForConnectionString('postgresql://postgres:pass@localhost:5432/lms');
  assert.equal(localUrl, false);

  const cloudSql = resolvePostgresPoolConfig({
    SQL_HOST: '10.0.0.5',
    SQL_USER: 'app',
    SQL_PASSWORD: 'secret',
    SQL_DB_NAME: 'cendekia',
  });
  assert.equal(cloudSql.configured, true);
  assert.equal(cloudSql.mode, 'host');
  assert.equal(cloudSql.host, '10.0.0.5');
});

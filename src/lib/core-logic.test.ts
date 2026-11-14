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
import type { ServerExamQuestion } from '../types/lms';

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

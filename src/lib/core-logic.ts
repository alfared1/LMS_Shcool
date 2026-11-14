import type { ServerExamQuestion, SubjectGradeRow } from '../types/lms';

/**
 * FNV-1a 32-bit string hash for deterministic PRNG seeding.
 */
export function hashSeedString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 deterministic PRNG in [0, 1).
 */
export function createSeededRng(seedString: string): () => number {
  let state = hashSeedString(seedString) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates deterministic shuffle seeded by studentId + examId.
 * Guarantees consistent order across page reloads while remaining unique per student.
 */
export function deterministicShuffle<T>(items: readonly T[], seedString: string): T[] {
  const result = [...items];
  const rng = createSeededRng(seedString);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * Converts a 6-digit hex color to HSL components and selects WCAG-accessible foreground color.
 */
export function hexToHslComponents(hex: string): {
  h: number;
  s: number;
  l: number;
  hslString: string;
  fgString: string;
} {
  const clean = hex.replace('#', '').trim();
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
  }

  const hRounded = Math.round(h);
  const sRounded = Math.round(s * 100);
  const lRounded = Math.round(l * 100);

  // Relative luminance for WCAG contrast foreground selection
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const fgString = luminance > 0.42 ? '222 47% 11%' : '0 0% 100%';

  return {
    h: hRounded,
    s: sRounded,
    l: lRounded,
    hslString: `${hRounded} ${sRounded}% ${lRounded}%`,
    fgString,
  };
}

/**
 * Aggregates final subject score using curriculum weights:
 * 20% Game/LKPD + 20% Tugas + 25% UTS + 35% UAS
 */
export function calculateFinalGrade(
  scores: {
    dailyGameAvg: number;
    taskScore: number;
    utsScore: number;
    uasScore: number;
  },
  kkm = 75
): {
  finalGrade: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  passedKkm: boolean;
} {
  const weighted =
    scores.dailyGameAvg * 0.2 +
    scores.taskScore * 0.2 +
    scores.utsScore * 0.25 +
    scores.uasScore * 0.35;
  const finalGrade = Math.round(weighted * 10) / 10;

  let predicate: 'A' | 'B' | 'C' | 'D' = 'D';
  if (finalGrade >= 90) predicate = 'A';
  else if (finalGrade >= 80) predicate = 'B';
  else if (finalGrade >= kkm) predicate = 'C';

  return {
    finalGrade,
    predicate,
    passedKkm: finalGrade >= kkm,
  };
}

export function recalculateGradebookRows(rows: SubjectGradeRow[]): SubjectGradeRow[] {
  return rows.map((row) => {
    const computed = calculateFinalGrade(
      {
        dailyGameAvg: row.dailyGameAvg,
        taskScore: row.taskScore,
        utsScore: row.utsScore,
        uasScore: row.uasScore,
      },
      row.kkm
    );
    return {
      ...row,
      finalGrade: computed.finalGrade,
      predicate: computed.predicate,
    };
  });
}

/**
 * Server-side exam scoring without ever exposing correctOptionId to client.
 */
export function scoreExamAnswers(
  questions: ServerExamQuestion[],
  answers: Record<string, string>
): {
  score: number;
  correctCount: number;
  totalQuestions: number;
} {
  if (questions.length === 0) {
    return { score: 0, correctCount: 0, totalQuestions: 0 };
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  let correctCount = 0;

  for (const q of questions) {
    const weight = q.weight || 1;
    totalWeight += weight;
    if (answers[q.id] && answers[q.id] === q.correctOptionId) {
      earnedWeight += weight;
      correctCount += 1;
    }
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0;
  return {
    score,
    correctCount,
    totalQuestions: questions.length,
  };
}

/**
 * Password Entropy & Strength evaluator for Terminal Agen Siber (Misi 1).
 */
export function checkPasswordEntropy(password: string): {
  score: number;
  entropyBits: number;
  label: 'Sangat Lemah' | 'Lemah' | 'Sedang' | 'Kuat' | 'Sangat Kuat';
  crackTimeEstimate: string;
} {
  if (!password) {
    return {
      score: 0,
      entropyBits: 0,
      label: 'Sangat Lemah',
      crackTimeEstimate: 'Instan (< 1 detik)',
    };
  }

  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

  const entropyBits = Math.round(password.length * Math.log2(Math.max(charsetSize, 1)));
  const commonWeak = ['123456', 'password', 'admin123', 'qwerty', 'sekolah123'].includes(
    password.toLowerCase()
  );

  let score = Math.min(100, Math.round((entropyBits / 80) * 100));
  if (commonWeak) score = Math.min(score, 15);

  let label: 'Sangat Lemah' | 'Lemah' | 'Sedang' | 'Kuat' | 'Sangat Kuat' = 'Sangat Lemah';
  let crackTimeEstimate = 'Instan (< 1 detik)';

  if (score >= 80) {
    label = 'Sangat Kuat';
    crackTimeEstimate = 'Berabad-abad (Aman dari Brute-Force)';
  } else if (score >= 60) {
    label = 'Kuat';
    crackTimeEstimate = 'Puluhan tahun';
  } else if (score >= 40) {
    label = 'Sedang';
    crackTimeEstimate = 'Beberapa hari';
  } else if (score >= 20) {
    label = 'Lemah';
    crackTimeEstimate = 'Beberapa menit';
  }

  return { score, entropyBits, label, crackTimeEstimate };
}

/**
 * Regex Vault validator for Terminal Agen Siber (Misi 3).
 * Must include uppercase, lowercase, number, symbol, and length >= 10.
 */
export function validateVaultPassword(password: string): {
  isValid: boolean;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
} {
  const checks = {
    minLength: password.length >= 10,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  return {
    isValid:
      checks.minLength &&
      checks.hasUppercase &&
      checks.hasLowercase &&
      checks.hasNumber &&
      checks.hasSymbol,
    checks,
  };
}

/**
 * Formats seconds into HH:MM:SS for Server-Authoritative CBT Timer.
 */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

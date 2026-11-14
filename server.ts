import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  getSchoolConfig,
  updateSchoolConfig,
  listGames,
  getGameBySlug,
  createEducationalGame,
  recordGameSession,
  listMaterials,
  createLearningMaterial,
  incrementMaterialView,
  listExamPackets,
  verifyTokenAndGetExam,
  getExamSessionForRoom,
  saveAttemptAnswer,
  recordAttemptViolation,
  submitExamAttempt,
  getProctorOverview,
  rotateExamToken,
  performProctorAction,
  getPrimaryReportCard,
  updateGradebookRow,
  verifyReportCardByHash,
  listAuditLogs,
  getRecentGameSessions,
} from './src/server/db';
import { handleAiTutorChat } from './src/server/ai-tutor';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // --- White-Label Tenant Config ---
  app.get('/api/config', (_req, res) => {
    res.json(getSchoolConfig());
  });

  app.put('/api/config', (req, res) => {
    const updated = updateSchoolConfig(req.body || {}, req.body?.actorName || 'Super Admin');
    res.json(updated);
  });

  // --- Games & Gamified LKPD ---
  app.get('/api/games', (_req, res) => {
    res.json(listGames());
  });

  app.get('/api/games/:slug', (req, res) => {
    const game = getGameBySlug(req.params.slug);
    if (!game) {
      res.status(404).json({ error: 'Game tidak ditemukan.' });
      return;
    }
    res.json(game);
  });

  app.post('/api/games', (req, res) => {
    const { title, creatorName, subjectCode, subjectName, level, gradeLevel, engineType, configJson } = req.body || {};
    if (!title || !engineType || !configJson) {
      res.status(400).json({ error: 'Judul, tipe engine, dan konfigurasi JSON wajib diisi.' });
      return;
    }
    try {
      JSON.parse(typeof configJson === 'string' ? configJson : JSON.stringify(configJson));
    } catch {
      res.status(400).json({ error: 'Format JSON konfigurasi game tidak valid.' });
      return;
    }
    const created = createEducationalGame({
      title: String(title),
      creatorName: String(creatorName || 'Ustadz Hendra, M.Pd'),
      subjectCode: String(subjectCode || 'UMUM'),
      subjectName: String(subjectName || 'Lintas Mapel'),
      level: level === 'SMP' ? 'SMP' : 'SMA',
      gradeLevel: Number(gradeLevel || 10),
      engineType,
      configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson),
    });
    res.status(201).json(created);
  });

  app.post('/api/games/:slug/sessions', (req, res) => {
    const { studentName, classroomName, score, durationSeconds } = req.body || {};
    const result = recordGameSession({
      slug: req.params.slug,
      studentName: String(studentName || 'Ahmad Fauzi'),
      classroomName: String(classroomName || 'X-IPA-1'),
      score: Number(score || 0),
      durationSeconds: Number(durationSeconds || 30),
    });
    res.json(result);
  });

  app.get('/api/game-sessions', (_req, res) => {
    res.json(getRecentGameSessions(12));
  });

  // --- Digital Library Materials ---
  app.get('/api/materials', (_req, res) => {
    res.json(listMaterials());
  });

  app.post('/api/materials', (req, res) => {
    const { title, authorName, subjectName, level, gradeLevel, materialType, summary, contentMarkdown } = req.body || {};
    if (!title || !summary) {
      res.status(400).json({ error: 'Judul dan ringkasan materi wajib diisi.' });
      return;
    }
    const created = createLearningMaterial({
      title: String(title),
      authorName: String(authorName || 'Ustadz Hendra, M.Pd'),
      subjectName: String(subjectName || 'Informatika'),
      level: level === 'SMP' ? 'SMP' : 'SMA',
      gradeLevel: Number(gradeLevel || 10),
      materialType: materialType || 'MODUL_PDF',
      summary: String(summary),
      contentMarkdown: String(contentMarkdown || summary),
    });
    res.status(201).json(created);
  });

  app.post('/api/materials/:slug/view', (req, res) => {
    const viewsCount = incrementMaterialView(req.params.slug);
    res.json({ viewsCount });
  });

  // --- High-Security CBT ---
  app.get('/api/cbt/exams', (_req, res) => {
    res.json(listExamPackets());
  });

  app.post('/api/cbt/verify-token', (req, res) => {
    const { examId, token, studentName, studentNisn, classroomName } = req.body || {};
    if (!examId || !token) {
      res.status(400).json({ ok: false, error: 'Token 6-digit wajib diisi.' });
      return;
    }
    const result = verifyTokenAndGetExam({
      examId: String(examId),
      token: String(token),
      studentName: String(studentName || 'Ahmad Fauzi'),
      studentNisn: String(studentNisn || '0084921034'),
      classroomName: String(classroomName || 'X-IPA-1'),
    });
    if (!result.ok) {
      res.status(401).json(result);
      return;
    }
    res.json(result);
  });

  app.get('/api/cbt/session/:examId', (req, res) => {
    const studentNisn = String(req.query.nisn || '0084921034');
    const session = getExamSessionForRoom(req.params.examId, studentNisn);
    if (!session) {
      res.status(404).json({ error: 'Sesi ujian belum dimulai. Silakan masukkan token di Lobi CBT.' });
      return;
    }
    res.json(session);
  });

  app.post('/api/cbt/attempts/:attemptId/answer', (req, res) => {
    const { answers, flaggedIds } = req.body || {};
    const updated = saveAttemptAnswer(req.params.attemptId, answers || {}, flaggedIds || []);
    if (!updated) {
      res.status(404).json({ error: 'Attempt tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/cbt/attempts/:attemptId/violation', (req, res) => {
    const { type, detail } = req.body || {};
    const updated = recordAttemptViolation(
      req.params.attemptId,
      type || 'TAB_SWITCH',
      String(detail || 'Terdeteksi meninggalkan jendela ujian CBT')
    );
    if (!updated) {
      res.status(404).json({ error: 'Attempt tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  app.post('/api/cbt/attempts/:attemptId/submit', (req, res) => {
    const updated = submitExamAttempt(req.params.attemptId);
    if (!updated) {
      res.status(404).json({ error: 'Attempt tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  // --- Real-Time Proctor Command Center ---
  app.get('/api/proctor/overview', (_req, res) => {
    res.json(getProctorOverview());
  });

  app.post('/api/proctor/rotate-token', (req, res) => {
    const { examId, actorName } = req.body || {};
    const token = rotateExamToken(String(examId || 'uas-informatika-2026'), String(actorName || 'Ibu Rina (Pengawas)'));
    res.json({ dynamicToken: token });
  });

  app.post('/api/proctor/attempts/:attemptId/action', (req, res) => {
    const { action, actorName } = req.body || {};
    if (!['UNLOCK_SESSION', 'RESET_DEVICE', 'ADD_TIME_10M'].includes(action)) {
      res.status(400).json({ error: 'Aksi pengawas tidak dikenali.' });
      return;
    }
    const updated = performProctorAction(req.params.attemptId, action, String(actorName || 'Ibu Rina (Pengawas)'));
    if (!updated) {
      res.status(404).json({ error: 'Data sesi siswa tidak ditemukan.' });
      return;
    }
    res.json(updated);
  });

  // --- E-Rapor, Gradebook & Verification ---
  app.get('/api/erapor', (_req, res) => {
    res.json(getPrimaryReportCard());
  });

  app.put('/api/erapor/grade', (req, res) => {
    const { code, dailyGameAvg, taskScore, utsScore, uasScore, actorName } = req.body || {};
    if (!code) {
      res.status(400).json({ error: 'Kode mata pelajaran wajib diisi.' });
      return;
    }
    const updated = updateGradebookRow(
      String(code),
      {
        dailyGameAvg: Number(dailyGameAvg),
        taskScore: Number(taskScore),
        utsScore: Number(utsScore),
        uasScore: Number(uasScore),
      },
      String(actorName || 'Ustadz Hendra, M.Pd')
    );
    res.json(updated);
  });

  app.get('/api/verify/:hash', (req, res) => {
    res.json(verifyReportCardByHash(req.params.hash));
  });

  app.get('/api/audit-logs', (_req, res) => {
    res.json(listAuditLogs(30));
  });

  // --- Voice AI Tutor (with CBT Lockout) ---
  app.post('/api/ai-tutor/chat', handleAiTutorChat);

  // --- Vite Middleware / Static Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CendekiaEdu LMS server listening on http://localhost:${PORT}`);
  });
}

startServer();

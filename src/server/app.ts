import express from 'express';
import {
  getSchoolConfigPg,
  updateSchoolConfigPg,
  listGamesPg,
  getGameBySlugPg,
  createEducationalGamePg,
  recordGameSessionPg,
  listMaterialsPg,
  createLearningMaterialPg,
  incrementMaterialViewPg,
  listExamPacketsPg,
  listManageExamPacketsPg,
  createExamPacketPg,
  addQuestionsToExamPacketPg,
  verifyTokenAndGetExamPg,
  getExamSessionForRoomPg,
  saveAttemptAnswerPg,
  recordAttemptViolationPg,
  submitExamAttemptPg,
  getProctorOverviewPg,
  rotateExamTokenPg,
  performProctorActionPg,
  getPrimaryReportCardPg,
  updateGradebookRowPg,
  verifyReportCardByHashPg,
  listAuditLogsPg,
  getRecentGameSessionsPg,
} from '../db/lms-repo.ts';
import { isPostgresConfigured } from '../db/index.ts';
import { getOrCreateUser, getUsers, updateUserRoleByUid } from '../db/users.ts';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { handleAiTutorChat } from './ai-tutor.ts';
import { handleAiGameGenerate } from './ai-game.ts';

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'cendekiaedu-lms',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      storage: isPostgresConfigured() ? 'postgresql' : 'in-memory-fallback',
      timestamp: new Date().toISOString(),
    });
  });

  // --- Firebase Auth + PostgreSQL User Sync (Protected) ---
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: Missing UID' });
        return;
      }
      const email = req.user?.email || String(req.body?.email || '');
      const displayName =
        (typeof req.user?.name === 'string' ? req.user.name : null) ||
        (typeof req.body?.displayName === 'string' ? req.body.displayName : null);
      const role = typeof req.body?.role === 'string' ? req.body.role : undefined;

      const user = await getOrCreateUser(uid, email, displayName, role);
      res.json(user);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to sync user';
      console.error('Failed to sync authenticated user:', error);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const allUsers = await getUsers();
      res.json(allUsers);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch users';
      console.error('Failed to fetch users:', error);
      res.status(500).json({ error: msg });
    }
  });

  app.patch('/api/users/role', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const role = String(req.body?.role || '');
      if (!uid || !role) {
        res.status(400).json({ error: 'Role wajib diisi.' });
        return;
      }
      const updated = await updateUserRoleByUid(uid, role);
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update user role';
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: msg });
    }
  });

  // --- White-Label Tenant Config ---
  app.get('/api/config', async (_req, res) => {
    try {
      res.json(await getSchoolConfigPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load config';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const updated = await updateSchoolConfigPg(
        req.body || {},
        req.body?.actorName || 'Administrator Sekolah'
      );
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update config';
      res.status(500).json({ error: msg });
    }
  });

  // --- Games & Gamified LKPD ---
  app.get('/api/games', async (_req, res) => {
    try {
      res.json(await listGamesPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load games';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/games/:slug', async (req, res) => {
    try {
      const game = await getGameBySlugPg(req.params.slug);
      if (!game) {
        res.status(404).json({ error: 'Game tidak ditemukan.' });
        return;
      }
      res.json(game);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load game';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/games', async (req, res) => {
    const {
      title,
      creatorName,
      subjectCode,
      subjectName,
      level,
      gradeLevel,
      engineType,
      configJson,
      isAiGenerated,
      difficulty,
    } = req.body || {};
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
    try {
      const created = await createEducationalGamePg({
        title: String(title),
        creatorName: String(creatorName || 'Ustadz Hendra, M.Pd'),
        subjectCode: String(subjectCode || 'UMUM'),
        subjectName: String(subjectName || 'Lintas Mapel'),
        level: level === 'SMP' ? 'SMP' : 'SMA',
        gradeLevel: Number(gradeLevel || 10),
        engineType,
        configJson: typeof configJson === 'string' ? configJson : JSON.stringify(configJson),
        isAiGenerated: Boolean(isAiGenerated),
        difficulty,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create game';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/games/:slug/sessions', async (req, res) => {
    try {
      const { studentName, classroomName, score, durationSeconds } = req.body || {};
      const result = await recordGameSessionPg({
        slug: req.params.slug,
        studentName: String(studentName || 'Ahmad Fauzi'),
        classroomName: String(classroomName || 'X-IPA-1'),
        score: Number(score || 0),
        durationSeconds: Number(durationSeconds || 30),
      });
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to record session';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/game-sessions', async (_req, res) => {
    try {
      res.json(await getRecentGameSessionsPg(12));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load sessions';
      res.status(500).json({ error: msg });
    }
  });

  // --- Digital Library Materials ---
  app.get('/api/materials', async (_req, res) => {
    try {
      res.json(await listMaterialsPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load materials';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/materials', async (req, res) => {
    const {
      title,
      authorName,
      subjectName,
      level,
      gradeLevel,
      materialType,
      summary,
      contentMarkdown,
      fileName,
      fileSizeLabel,
      pdfDataUrl,
    } = req.body || {};
    if (!title || !summary) {
      res.status(400).json({ error: 'Judul dan ringkasan materi wajib diisi.' });
      return;
    }
    try {
      const created = await createLearningMaterialPg({
        title: String(title),
        authorName: String(authorName || 'Ustadz Hendra, M.Pd'),
        subjectName: String(subjectName || 'Informatika'),
        level: level === 'SMP' ? 'SMP' : 'SMA',
        gradeLevel: Number(gradeLevel || 10),
        materialType: materialType || 'MODUL_PDF',
        summary: String(summary),
        contentMarkdown: String(contentMarkdown || summary),
        fileName: fileName ? String(fileName) : undefined,
        fileSizeLabel: fileSizeLabel ? String(fileSizeLabel) : undefined,
        pdfDataUrl: pdfDataUrl ? String(pdfDataUrl) : undefined,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create material';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/materials/:slug/view', async (req, res) => {
    try {
      const viewsCount = await incrementMaterialViewPg(req.params.slug);
      res.json({ viewsCount });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to increment views';
      res.status(500).json({ error: msg });
    }
  });

  // --- High-Security CBT ---
  app.get('/api/cbt/exams', async (_req, res) => {
    try {
      res.json(await listExamPacketsPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load CBT packets';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/cbt/manage', async (_req, res) => {
    try {
      res.json(await listManageExamPacketsPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load CBT bank';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/exams', async (req, res) => {
    const {
      id,
      title,
      examType,
      subjectName,
      gradeLevel,
      durationMinutes,
      maxTabSwitches,
      dynamicToken,
      requireSeb,
      questions,
      actorName,
    } = req.body || {};

    if (!title || !dynamicToken || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({
        error: 'Judul ujian, token 6 digit, dan minimal 1 butir soal wajib diisi.',
      });
      return;
    }

    try {
      const created = await createExamPacketPg({
        id: id ? String(id) : undefined,
        title: String(title),
        examType: examType || 'UTS',
        subjectName: String(subjectName || 'Umum'),
        gradeLevel: Number(gradeLevel || 10),
        durationMinutes: Number(durationMinutes || 60),
        maxTabSwitches: Number(maxTabSwitches || 3),
        dynamicToken: String(dynamicToken),
        requireSeb: Boolean(requireSeb),
        questions,
        actorName: actorName ? String(actorName) : undefined,
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create CBT exam';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/exams/:examId/questions', async (req, res) => {
    const { questions, actorName } = req.body || {};
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: 'Daftar soal tambahan tidak boleh kosong.' });
      return;
    }
    try {
      const updated = await addQuestionsToExamPacketPg(
        req.params.examId,
        questions,
        actorName ? String(actorName) : undefined
      );
      if (!updated) {
        res.status(404).json({ error: 'Paket ujian tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to add CBT questions';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/verify-token', async (req, res) => {
    const { examId, token, studentName, studentNisn, classroomName } = req.body || {};
    if (!examId || !token) {
      res.status(400).json({ ok: false, error: 'Token 6-digit wajib diisi.' });
      return;
    }
    try {
      const result = await verifyTokenAndGetExamPg({
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to verify exam token';
      res.status(500).json({ ok: false, error: msg });
    }
  });

  app.get('/api/cbt/session/:examId', async (req, res) => {
    try {
      const studentNisn = String(req.query.nisn || '0084921034');
      const session = await getExamSessionForRoomPg(req.params.examId, studentNisn);
      if (!session) {
        res.status(404).json({ error: 'Sesi ujian belum dimulai. Silakan masukkan token di Lobi CBT.' });
        return;
      }
      res.json(session);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load exam session';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/attempts/:attemptId/answer', async (req, res) => {
    try {
      const { answers, flaggedIds } = req.body || {};
      const updated = await saveAttemptAnswerPg(req.params.attemptId, answers || {}, flaggedIds || []);
      if (!updated) {
        res.status(404).json({ error: 'Attempt tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save answer';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/attempts/:attemptId/violation', async (req, res) => {
    try {
      const { type, detail } = req.body || {};
      const updated = await recordAttemptViolationPg(
        req.params.attemptId,
        type || 'TAB_SWITCH',
        String(detail || 'Terdeteksi meninggalkan jendela ujian CBT')
      );
      if (!updated) {
        res.status(404).json({ error: 'Attempt tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to record violation';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/cbt/attempts/:attemptId/submit', async (req, res) => {
    try {
      const updated = await submitExamAttemptPg(req.params.attemptId);
      if (!updated) {
        res.status(404).json({ error: 'Attempt tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to submit exam';
      res.status(500).json({ error: msg });
    }
  });

  // --- Real-Time Proctor Command Center ---
  app.get('/api/proctor/overview', async (req, res) => {
    try {
      const examId = typeof req.query.examId === 'string' ? req.query.examId : undefined;
      res.json(await getProctorOverviewPg(examId));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load proctor overview';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/proctor/rotate-token', async (req, res) => {
    try {
      const { examId, actorName } = req.body || {};
      const token = await rotateExamTokenPg(
        String(examId || 'uas-informatika-2026'),
        String(actorName || 'Ibu Rina (Pengawas)')
      );
      res.json({ dynamicToken: token });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to rotate token';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/proctor/attempts/:attemptId/action', async (req, res) => {
    const { action, actorName } = req.body || {};
    if (!['UNLOCK_SESSION', 'RESET_DEVICE', 'ADD_TIME_10M'].includes(action)) {
      res.status(400).json({ error: 'Aksi pengawas tidak dikenali.' });
      return;
    }
    try {
      const updated = await performProctorActionPg(
        req.params.attemptId,
        action,
        String(actorName || 'Ibu Rina (Pengawas)')
      );
      if (!updated) {
        res.status(404).json({ error: 'Data sesi siswa tidak ditemukan.' });
        return;
      }
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to execute proctor action';
      res.status(500).json({ error: msg });
    }
  });

  // --- E-Rapor, Gradebook & Verification ---
  app.get('/api/erapor', async (_req, res) => {
    try {
      res.json(await getPrimaryReportCardPg());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load report card';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/erapor/grade', async (req, res) => {
    const { code, dailyGameAvg, taskScore, utsScore, uasScore, actorName } = req.body || {};
    if (!code) {
      res.status(400).json({ error: 'Kode mata pelajaran wajib diisi.' });
      return;
    }
    try {
      const updated = await updateGradebookRowPg(
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update gradebook';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/verify/:hash', async (req, res) => {
    try {
      res.json(await verifyReportCardByHashPg(req.params.hash));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to verify hash';
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/audit-logs', async (_req, res) => {
    try {
      res.json(await listAuditLogsPg(30));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load audit logs';
      res.status(500).json({ error: msg });
    }
  });

  // --- Voice AI Tutor (with CBT Lockout) ---
  app.post('/api/ai-tutor/chat', handleAiTutorChat);

  // --- AI Prompt-to-Game & Quiz Studio ---
  app.post('/api/ai-game/generate', handleAiGameGenerate);

  return app;
}

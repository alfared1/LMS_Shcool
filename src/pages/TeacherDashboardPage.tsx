import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Gamepad2,
  Loader2,
  Megaphone,
  Play,
  Save,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { SEED_REPORT_CARD } from '../lib/seed-data';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import {
  AI_STUDIO_PRESET_PROMPTS,
  generateSmartGameConfig,
  type GameDifficulty,
} from '../lib/ai-game-generator';
import { formatFileSize, readFileAsDataUrl } from '../lib/pdf-helper';
import { CbtExamBankManager } from '../components/cbt/CbtExamBankManager';
import { PdfMaterialViewerModal } from '../components/materials/PdfMaterialViewerModal';
import type {
  EducationalGame,
  GameEngineType,
  LearningMaterial,
  ReportCardDTO,
  SubjectGradeRow,
} from '../types/lms';

const ENGINE_OPTIONS: Array<{ value: GameEngineType; label: string; desc: string }> = [
  { value: 'MILLIONAIRE_QUIZ', label: 'Millionaire Quiz', desc: 'Kuis bertingkat + 5 Lifelines' },
  { value: 'SWIPE_CARD', label: 'Swipe Card', desc: 'Klasifikasi kilat Kiri / Kanan' },
  { value: 'IFP_TOWER_BATTLE', label: 'IFP Tower Battle', desc: 'Split-screen 2 tim papan kelas' },
  { value: 'TURN_BASED_ARENA', label: 'Turn-Based Arena', desc: 'Duel kelompok bergilir + Kartu Ihsan' },
  { value: 'ROLEPLAY_LKPD', label: 'Roleplay LKPD', desc: 'Misi bertahap & inspeksi kasus' },
];

const GENERATION_STAGES = [
  'Menganalisis topik kurikulum...',
  'Menyusun butir soal & pengecoh...',
  'Merakit konfigurasi engine game...',
];

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { roleProfile, addUploadedMaterial, uploadedMaterials, saveAiGame } = useTenantAndDemo();

  const [tab, setTab] = useState<'gradebook' | 'cbt_bank' | 'ai_studio' | 'material'>('gradebook');
  const [rapor, setRapor] = useState<ReportCardDTO>(SEED_REPORT_CARD);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null);

  // Module 3: AI Prompt-to-Game & Quiz Studio state
  const [aiEngine, setAiEngine] = useState<GameEngineType>('MILLIONAIRE_QUIZ');
  const [aiLevel, setAiLevel] = useState<'SMP' | 'SMA'>('SMA');
  const [aiGrade, setAiGrade] = useState<number>(11);
  const [aiSubject, setAiSubject] = useState('Biologi');
  const [aiDifficulty, setAiDifficulty] = useState<GameDifficulty>('Sedang');
  const [aiPrompt, setAiPrompt] = useState(AI_STUDIO_PRESET_PROMPTS[0].prompt);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genStageIdx, setGenStageIdx] = useState(0);
  const [genSource, setGenSource] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedConfig, setGeneratedConfig] = useState<Record<string, unknown> | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonDraft, setRawJsonDraft] = useState('');
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Module 2: PDF Material Uploader state
  const [matTitle, setMatTitle] = useState('');
  const [matLevel, setMatLevel] = useState<'SMP' | 'SMA'>('SMA');
  const [matGrade, setMatGrade] = useState<number>(10);
  const [matSubject, setMatSubject] = useState('Informatika');
  const [matType, setMatType] = useState<'MODUL_PDF' | 'INTERACTIVE_LKPD' | 'ARTICLE_BLOG'>('MODUL_PDF');
  const [matSummary, setMatSummary] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const stageTimersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    fetch('/api/erapor')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && d.grades && setRapor(d))
      .catch(() => undefined);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const handleGradeChange = (
    code: string,
    field: 'dailyGameAvg' | 'taskScore' | 'utsScore' | 'uasScore',
    value: number
  ) => {
    setRapor((prev) => ({
      ...prev,
      grades: prev.grades.map((g) => (g.code === code ? { ...g, [field]: value } : g)),
    }));
  };

  const saveGradeRow = async (row: SubjectGradeRow) => {
    setSavingCode(row.code);
    try {
      const res = await fetch('/api/erapor/grade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: row.code,
          dailyGameAvg: row.dailyGameAvg,
          taskScore: row.taskScore,
          utsScore: row.utsScore,
          uasScore: row.uasScore,
          actorName: roleProfile.personName,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ReportCardDTO;
        setRapor(updated);
        showToast(`Nilai ${row.name} disimpan & SHA-256 E-Rapor diperbarui.`);
      }
    } finally {
      setSavingCode(null);
    }
  };

  // --- Module 3 Handlers: AI Prompt-to-Game Studio ---
  const applyPresetChip = (chip: (typeof AI_STUDIO_PRESET_PROMPTS)[number]) => {
    setAiEngine(chip.engineType);
    setAiLevel(chip.level);
    setAiGrade(chip.gradeLevel);
    setAiSubject(chip.subjectName);
    setAiDifficulty(chip.difficulty);
    setAiPrompt(chip.prompt);
  };

  const handleGenerateAiGame = async () => {
    if (!aiPrompt.trim()) {
      showToast('Masukkan prompt topik pembelajaran terlebih dahulu.');
      return;
    }

    stageTimersRef.current.forEach((id) => window.clearTimeout(id));
    stageTimersRef.current = [];
    setIsGenerating(true);
    setGenStageIdx(0);
    setPublishedSlug(null);

    const t1 = window.setTimeout(() => setGenStageIdx(1), 420);
    const t2 = window.setTimeout(() => setGenStageIdx(2), 880);
    stageTimersRef.current.push(t1, t2);

    const payload = {
      prompt: aiPrompt,
      engineType: aiEngine,
      level: aiLevel,
      gradeLevel: aiGrade,
      subjectName: aiSubject,
      difficulty: aiDifficulty,
    };

    try {
      const [apiRes] = await Promise.all([
        fetch('/api/ai-game/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        new Promise((r) => setTimeout(r, 1250)),
      ]);

      const result =
        apiRes && apiRes.config
          ? apiRes
          : generateSmartGameConfig(payload);

      setGeneratedTitle(result.title);
      setGeneratedConfig(result.config);
      setRawJsonDraft(JSON.stringify(result.config, null, 2));
      setGenSource(result.source === 'gemini' ? 'Gemini AI' : 'Smart Curriculum Engine');
      showToast(`Berhasil merakit game "${result.title}"! Silakan tinjau, edit, atau uji coba.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateGeneratedQuestionText = (idx: number, nextQuestion: string) => {
    if (!generatedConfig) return;
    const qs = Array.isArray(generatedConfig.questions) ? [...generatedConfig.questions] : [];
    if (!qs[idx]) return;
    qs[idx] = { ...(qs[idx] as Record<string, unknown>), question: nextQuestion };
    const nextCfg = { ...generatedConfig, questions: qs };
    setGeneratedConfig(nextCfg);
    setRawJsonDraft(JSON.stringify(nextCfg, null, 2));
  };

  const updateGeneratedSwipeCardTitle = (idx: number, nextTitle: string) => {
    if (!generatedConfig) return;
    const cards = Array.isArray(generatedConfig.cards) ? [...generatedConfig.cards] : [];
    if (!cards[idx]) return;
    cards[idx] = { ...(cards[idx] as Record<string, unknown>), title: nextTitle };
    const nextCfg = { ...generatedConfig, cards };
    setGeneratedConfig(nextCfg);
    setRawJsonDraft(JSON.stringify(nextCfg, null, 2));
  };

  const handleSyncRawJson = (nextJson: string) => {
    setRawJsonDraft(nextJson);
    try {
      const parsed = JSON.parse(nextJson) as Record<string, unknown>;
      setGeneratedConfig(parsed);
    } catch {
      // let user continue typing valid JSON
    }
  };

  const buildLocalTrialGame = (): EducationalGame => {
    const slugBase = generatedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 44);
    const slug = `${slugBase || 'ai-game'}-${Date.now().toString().slice(-4)}`;
    return {
      id: `ai-game-${Date.now()}`,
      slug,
      title: generatedTitle || `Game AI ${aiSubject}`,
      creatorName: roleProfile.personName,
      subjectCode: aiSubject.slice(0, 3).toUpperCase(),
      subjectName: aiSubject,
      level: aiLevel,
      gradeLevel: aiGrade,
      engineType: aiEngine,
      playCount: 0,
      configJson: JSON.stringify(generatedConfig || {}),
      createdAt: new Date().toISOString(),
      isAiGenerated: true,
      difficulty: aiDifficulty,
    };
  };

  const handlePlayTrialNow = () => {
    if (!generatedConfig) return;
    const trial = buildLocalTrialGame();
    saveAiGame(trial);
    navigate(`/games/${trial.slug}?autostart=1`);
  };

  const handlePublishAiGame = async () => {
    if (!generatedConfig || !generatedTitle.trim()) return;
    setIsPublishing(true);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          creatorName: roleProfile.personName,
          subjectCode: aiSubject.slice(0, 3).toUpperCase(),
          subjectName: aiSubject,
          level: aiLevel,
          gradeLevel: aiGrade,
          engineType: aiEngine,
          configJson: JSON.stringify(generatedConfig),
          isAiGenerated: true,
          difficulty: aiDifficulty,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as EducationalGame;
        const tagged: EducationalGame = { ...created, isAiGenerated: true, difficulty: aiDifficulty };
        saveAiGame(tagged);
        setPublishedSlug(tagged.slug);
        showToast(`Game AI "${tagged.title}" dipublikasikan ke Katalog Siswa!`);
      } else {
        const localGame = buildLocalTrialGame();
        saveAiGame(localGame);
        setPublishedSlug(localGame.slug);
        showToast(`Game AI "${localGame.title}" tersimpan ke Katalog Siswa!`);
      }
    } catch {
      const localGame = buildLocalTrialGame();
      saveAiGame(localGame);
      setPublishedSlug(localGame.slug);
      showToast(`Game AI "${localGame.title}" tersimpan ke Katalog Siswa!`);
    } finally {
      setIsPublishing(false);
    }
  };

  // --- Module 2 Handlers: PDF Upload ---
  const processSelectedPdf = async (file: File | null) => {
    setPdfError(null);
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setPdfError('Format file harus PDF (.pdf). Silakan pilih berkas PDF yang valid.');
      setSelectedPdfFile(null);
      setPdfPreviewUrl(null);
      setPdfDataUrl(null);
      return;
    }

    setSelectedPdfFile(file);
    if (!matTitle.trim()) {
      setMatTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }

    const objectUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(objectUrl);

    // Persist Base64 Data URL for files <= 3.5MB so it survives route switches, reloads & all 5 roles
    if (file.size <= 3.5 * 1024 * 1024) {
      try {
        const encoded = await readFileAsDataUrl(file);
        setPdfDataUrl(encoded);
      } catch {
        setPdfDataUrl(null);
      }
    } else {
      setPdfDataUrl(null);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !matSummary.trim()) return;
    if (matType === 'MODUL_PDF' && !selectedPdfFile) {
      setPdfError('Silakan pilih atau seret file PDF (.pdf) pada dropzone di bawah.');
      return;
    }

    setIsUploadingPdf(true);
    setUploadProgress(25);

    let resolvedDataUrl = pdfDataUrl;
    if (!resolvedDataUrl && selectedPdfFile && selectedPdfFile.size <= 3.5 * 1024 * 1024) {
      try {
        resolvedDataUrl = await readFileAsDataUrl(selectedPdfFile);
      } catch {
        resolvedDataUrl = null;
      }
    }

    setUploadProgress(65);
    await new Promise((r) => setTimeout(r, 180));
    setUploadProgress(100);

    const fileSizeLabel = selectedPdfFile ? formatFileSize(selectedPdfFile.size) : undefined;
    const slug = `${matTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 42)}-${Date.now().toString().slice(-4)}`;

    const newMaterial: LearningMaterial = {
      id: `mat-upload-${Date.now()}`,
      slug,
      title: matTitle.trim(),
      authorName: roleProfile.personName,
      subjectName: matSubject,
      level: matLevel,
      gradeLevel: matGrade,
      materialType: matType,
      summary: matSummary.trim(),
      contentMarkdown: matSummary.trim(),
      viewsCount: 1,
      readMinutes: 10,
      createdAt: new Date().toISOString(),
      fileName: selectedPdfFile?.name,
      fileSizeBytes: selectedPdfFile?.size,
      fileSizeLabel,
      pdfObjectUrl: pdfPreviewUrl || undefined,
      pdfDataUrl: resolvedDataUrl || undefined,
    };

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMaterial.title,
          authorName: newMaterial.authorName,
          subjectName: newMaterial.subjectName,
          level: newMaterial.level,
          gradeLevel: newMaterial.gradeLevel,
          materialType: newMaterial.materialType,
          summary: newMaterial.summary,
          contentMarkdown: newMaterial.contentMarkdown,
          fileName: newMaterial.fileName,
          fileSizeLabel: newMaterial.fileSizeLabel,
          pdfDataUrl: newMaterial.pdfDataUrl,
        }),
      });
      if (res.ok) {
        const saved = (await res.json()) as LearningMaterial;
        addUploadedMaterial({
          ...saved,
          pdfObjectUrl: newMaterial.pdfObjectUrl,
          pdfDataUrl: newMaterial.pdfDataUrl,
          fileSizeBytes: newMaterial.fileSizeBytes,
        });
      } else {
        addUploadedMaterial(newMaterial);
      }
    } catch {
      addUploadedMaterial(newMaterial);
    }

    setIsUploadingPdf(false);
    setUploadProgress(0);
    setMatTitle('');
    setMatSummary('');
    setSelectedPdfFile(null);
    setPdfPreviewUrl(null);
    setPdfDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(`Materi "${newMaterial.title}" berhasil diunggah dan langsung tersedia di Perpustakaan Siswa!`);
  };

  return (
    <div className="flex-1 p-6 sm:p-8 pb-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">PORTAL GURU & KREATOR KONTEN</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Studio Guru · {roleProfile.personName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: 'gradebook', label: 'Buku Nilai Otomatis' },
            { id: 'cbt_bank', label: '📝 Manajemen Ujian & Bank Soal CBT' },
            { id: 'ai_studio', label: '✨ AI Game & Quiz Studio' },
            { id: 'material', label: 'Unggah Materi PDF' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* TAB 1: GRADEBOOK */}
      {tab === 'gradebook' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Agregasi Nilai E-Rapor · {rapor.studentName} ({rapor.classroomName})
              </h2>
              <p className="text-xs text-slate-500">
                Formula Kurikulum: 20% Game/LKPD + 20% Tugas + 25% UTS + 35% UAS
              </p>
            </div>
            <Link
              to="/erapor"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-brand-primary"
            >
              Lihat Pratinjau E-Rapor
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pr-4">Mata Pelajaran</th>
                  <th className="py-3 px-2 text-right">Game (20%)</th>
                  <th className="py-3 px-2 text-right">Tugas (20%)</th>
                  <th className="py-3 px-2 text-right">UTS (25%)</th>
                  <th className="py-3 px-2 text-right">UAS (35%)</th>
                  <th className="py-3 px-2 text-right">Akhir</th>
                  <th className="py-3 px-2 text-center">Predikat</th>
                  <th className="py-3 pl-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rapor.grades.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-medium text-slate-900">{row.name}</td>
                    {(['dailyGameAvg', 'taskScore', 'utsScore', 'uasScore'] as const).map((f) => (
                      <td key={f} className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row[f]}
                          onChange={(e) => handleGradeChange(row.code, f, Number(e.target.value))}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                        />
                      </td>
                    ))}
                    <td className="py-3 px-2 text-right font-mono font-bold tabular-nums text-slate-900">
                      {row.finalGrade}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-brand-primary">
                      {row.predicate}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        disabled={savingCode === row.code}
                        onClick={() => saveGradeRow(row)}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-brand-primary-fg hover:opacity-90 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{savingCode === row.code ? '...' : 'Simpan'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: MANAJEMEN UJIAN & BANK SOAL CBT */}
      {tab === 'cbt_bank' && <CbtExamBankManager />}

      {/* TAB 3: AI PROMPT-TO-GAME & QUIZ STUDIO */}
      {tab === 'ai_studio' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Prompt Builder */}
          <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-brand-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-wide">AI Prompt-to-Game Studio</span>
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                  Buat Game Edukasi Otomatis dari Prompt
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Mendukung seluruh 5 engine game siswa. Hasil dapat diedit, diuji coba, dan langsung dipublikasikan.
                </p>
              </div>
              <Gamepad2 className="h-6 w-6 shrink-0 text-slate-300" />
            </div>

            {/* Quick Preset Chips */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Contoh Prompt Cepat (1 Klik):</p>
              <div className="flex flex-wrap gap-2">
                {AI_STUDIO_PRESET_PROMPTS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => applyPresetChip(chip)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Pilih Engine Game</label>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  {ENGINE_OPTIONS.map((eng) => (
                    <button
                      key={eng.value}
                      type="button"
                      onClick={() => setAiEngine(eng.value)}
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        aiEngine === eng.value
                          ? 'border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">{eng.label}</span>
                      <span className="block text-[11px] text-slate-500">{eng.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Mata Pelajaran</label>
                <input
                  type="text"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Tingkat Kesulitan</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as GameDifficulty)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Mudah">Mudah (Pemahaman Dasar)</option>
                  <option value="Sedang">Sedang (Aplikasi Konsep)</option>
                  <option value="HOTS">HOTS / Sulit (Analisis Kritis)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Jenjang</label>
                <select
                  value={aiLevel}
                  onChange={(e) => {
                    const nextLvl = e.target.value as 'SMP' | 'SMA';
                    setAiLevel(nextLvl);
                    setAiGrade(nextLvl === 'SMP' ? 8 : 11);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Kelas</label>
                <select
                  value={aiGrade}
                  onChange={(e) => setAiGrade(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {(aiLevel === 'SMP' ? [7, 8, 9] : [10, 11, 12]).map((g) => (
                    <option key={g} value={g}>
                      Kelas {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ai-prompt-input" className="block text-xs font-semibold text-slate-700">
                Instruksi / Topik Pembelajaran untuk AI
              </label>
              <textarea
                id="ai-prompt-input"
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Contoh: Buatkan 5 soal kuis tentang hukum Newton, gaya gesek, dan penerapannya dalam kehidupan sehari-hari..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateAiGame}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg shadow-xs hover:opacity-90 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{GENERATION_STAGES[genStageIdx]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Game dengan AI</span>
                </>
              )}
            </button>

            {isGenerating && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                {GENERATION_STAGES.map((stageLabel, idx) => (
                  <div key={stageLabel} className="flex items-center gap-2.5 text-xs">
                    {idx < genStageIdx ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : idx === genStageIdx ? (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-primary shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={idx <= genStageIdx ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                      {stageLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Right: Live Editable Preview + Actions */}
          <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
            {!generatedConfig ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <Sparkles className="h-8 w-8 text-brand-primary mb-3" />
                <h3 className="text-base font-bold text-slate-900">Pratinjau & Editor Konten AI</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                  Pilih engine game dan klik <strong>"Generate Game dengan AI"</strong> di panel kiri. Anda dapat mengedit setiap soal sebelum menerbitkannya ke siswa.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-brand-primary">
                        ✨ Hasil Rakitan ({genSource})
                      </span>
                      <h3 className="text-base font-bold text-slate-900">Pratinjau & Edit Butir Game</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRawJson((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>{showRawJson ? 'Mode Editor Visual' : 'Lihat / Edit JSON'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Judul Game (Dapat Diedit)</label>
                    <input
                      type="text"
                      value={generatedTitle}
                      onChange={(e) => setGeneratedTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                    />
                  </div>

                  {showRawJson ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Konfigurasi Engine JSON
                      </label>
                      <textarea
                        rows={12}
                        value={rawJsonDraft}
                        onChange={(e) => handleSyncRawJson(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs text-emerald-300"
                      />
                    </div>
                  ) : (
                    <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
                      {Array.isArray(generatedConfig.questions) &&
                        (generatedConfig.questions as Array<{ id?: string; question: string; correctId?: string; options?: Array<{ id: string; text: string }> }>).map(
                          (q, idx) => (
                            <div key={q.id || idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>SOAL #{idx + 1}</span>
                                <span className="text-emerald-700">Kunci: {q.correctId}</span>
                              </div>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) => updateGeneratedQuestionText(idx, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                              />
                              {Array.isArray(q.options) && (
                                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                                  {q.options.map((o) => (
                                    <div
                                      key={o.id}
                                      className={`rounded border px-2 py-1 ${
                                        o.id === q.correctId
                                          ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-900'
                                          : 'border-slate-200 bg-white'
                                      }`}
                                    >
                                      {o.id}. {o.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        )}

                      {Array.isArray(generatedConfig.cards) &&
                        (generatedConfig.cards as Array<{ id?: string; title: string; answer: string; explanation: string }>).map(
                          (card, idx) => (
                            <div key={card.id || idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>KARTU #{idx + 1}</span>
                                <span className="text-brand-primary">Arah: {card.answer}</span>
                              </div>
                              <input
                                type="text"
                                value={card.title}
                                onChange={(e) => updateGeneratedSwipeCardTitle(idx, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                              />
                              <p className="text-[11px] text-slate-600">{card.explanation}</p>
                            </div>
                          )
                        )}

                      {Array.isArray(generatedConfig.prompts) &&
                        (generatedConfig.prompts as Array<{ arabic: string; translit: string; category: string }>).map(
                          (p, idx) => (
                            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-900">{p.arabic}</span> ·{' '}
                                <span className="text-slate-700">{p.translit}</span>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-brand-primary">{p.category}</span>
                            </div>
                          )
                        )}

                      {Array.isArray(generatedConfig.phishingCases) &&
                        (generatedConfig.phishingCases as Array<{ id?: string; sender: string; snippet: string; isPhishing: boolean }>).map(
                          (c, idx) => (
                            <div key={c.id || idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                              <div className="flex justify-between font-semibold">
                                <span className="font-mono text-slate-700">{c.sender}</span>
                                <span className={c.isPhishing ? 'text-red-600' : 'text-emerald-700'}>
                                  {c.isPhishing ? 'Phishing' : 'Aman'}
                                </span>
                              </div>
                              <p className="text-slate-600">{c.snippet}</p>
                            </div>
                          )
                        )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handlePlayTrialNow}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-primary bg-brand-primary/10 px-4 py-2.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/20"
                  >
                    <Play className="h-4 w-4" />
                    <span>Uji Coba Mainkan Sekarang</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={handlePublishAiGame}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-brand-primary-fg hover:opacity-90 disabled:opacity-50"
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>{isPublishing ? 'Menerbitkan...' : 'Publikasikan ke Katalog Siswa'}</span>
                  </button>

                  {publishedSlug && (
                    <Link
                      to="/games"
                      className="text-xs font-bold text-brand-primary underline"
                    >
                      Lihat di Katalog Game Siswa →
                    </Link>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: PDF MATERIAL UPLOADER */}
      {tab === 'material' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleCreateMaterial}
            className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <UploadCloud className="h-5 w-5 text-brand-primary" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Unggah Materi PDF & Modul Ajar</h2>
                <p className="text-xs text-slate-500">
                  Materi langsung terhubung ke Perpustakaan Digital Siswa dengan Built-in PDF Viewer.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Judul Materi</label>
              <input
                type="text"
                required
                value={matTitle}
                onChange={(e) => setMatTitle(e.target.value)}
                placeholder="Contoh: Modul Ajar Struktur Data & Graf"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jenjang</label>
                <select
                  value={matLevel}
                  onChange={(e) => {
                    const nextLvl = e.target.value as 'SMP' | 'SMA';
                    setMatLevel(nextLvl);
                    setMatGrade(nextLvl === 'SMP' ? 8 : 10);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kelas</label>
                <select
                  value={matGrade}
                  onChange={(e) => setMatGrade(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {(matLevel === 'SMP' ? [7, 8, 9] : [10, 11, 12]).map((g) => (
                    <option key={g} value={g}>
                      Kelas {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={matSubject}
                  onChange={(e) => setMatSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jenis Konten</label>
                <select
                  value={matType}
                  onChange={(e) =>
                    setMatType(e.target.value as 'MODUL_PDF' | 'INTERACTIVE_LKPD' | 'ARTICLE_BLOG')
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="MODUL_PDF">Modul PDF</option>
                  <option value="INTERACTIVE_LKPD">LKPD Interaktif</option>
                  <option value="ARTICLE_BLOG">Artikel Akademik</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Deskripsi Ringkas</label>
              <textarea
                rows={3}
                required
                value={matSummary}
                onChange={(e) => setMatSummary(e.target.value)}
                placeholder="Tuliskan ringkasan kompetensi dan instruksi belajar untuk siswa..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {/* PDF Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unggah File PDF (Maks 3MB tersimpan permanen di browser)
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0] || null;
                  processSelectedPdf(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-brand-primary hover:bg-brand-primary/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => processSelectedPdf(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <FileText className="mx-auto h-8 w-8 text-brand-primary" />
                {selectedPdfFile ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-bold text-slate-900">{selectedPdfFile.name}</p>
                    <p className="font-mono text-xs text-slate-600">
                      Ukuran: {formatFileSize(selectedPdfFile.size)} · Pengunggah: {roleProfile.personName}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Klik untuk memilih atau seret berkas <span className="text-brand-primary">.PDF</span> ke sini
                    </p>
                    <p className="text-xs text-slate-500">Hanya menerima format application/pdf</p>
                  </div>
                )}
              </div>

              {pdfError && (
                <p className="mt-2 text-xs font-semibold text-red-600">{pdfError}</p>
              )}

              {isUploadingPdf && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Memproses & mengunggah PDF...</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-brand-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploadingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-brand-primary-fg hover:opacity-90 disabled:opacity-60"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isUploadingPdf ? 'Mengunggah...' : 'Terbitkan ke Perpustakaan Siswa'}</span>
            </button>
          </form>

          {/* Uploaded Materials History */}
          <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Materi Baru Diunggah</h3>
              <Link to="/materials" className="text-xs font-semibold text-brand-primary hover:underline">
                Buka Perpustakaan →
              </Link>
            </div>
            {uploadedMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                Belum ada file PDF baru pada sesi ini. Unggah file PDF melalui form di samping dan file akan langsung tampil di katalog siswa.
              </p>
            ) : (
              <div className="space-y-3">
                {uploadedMaterials.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-brand-primary">
                      <span>{m.subjectName} · {m.level} Kelas {m.gradeLevel}</span>
                      {m.fileSizeLabel && <span className="font-mono text-slate-500">{m.fileSizeLabel}</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{m.summary}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-slate-500">Oleh {m.authorName}</p>
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Buka / Pratinjau PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <PdfMaterialViewerModal
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />
    </div>
  );
}

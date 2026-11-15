import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  ImagePlus,
  KeyRound,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import {
  buildQuestionTemplateFile,
  generateExamToken6,
  generateHotsCbtQuestions,
  parseQuestionBankFile,
} from '../../lib/cbt-bank-parser';
import { readFileAsDataUrl } from '../../lib/pdf-helper';
import type { CbtExamType, ServerExamQuestion, StoredExamPacket } from '../../types/lms';

const EXAM_TYPES: CbtExamType[] = ['UTS', 'UAS', 'Ujian Sekolah', 'Kuis Harian'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const SUBJECT_SUGGESTIONS = [
  'Matematika',
  'Informatika & Literasi Digital',
  'Biologi',
  'Fisika',
  'Kimia',
  'PAI & Budi Pekerti',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Bahasa Arab',
  'IPS / Ekonomi',
];

interface ManagedPacketRow {
  id: string;
  title: string;
  examType: CbtExamType;
  level: 'SMP' | 'SMA';
  subjectName: string;
  gradeLevel: number;
  durationMinutes: number;
  maxTabSwitches: number;
  questionCount: number;
  dynamicToken?: string;
  questions?: ServerExamQuestion[];
}

export function CbtExamBankManager() {
  const {
    roleProfile,
    customExamPackets,
    activeExamPackets,
    saveExamPacket,
    appendQuestionsToExamPacket,
  } = useTenantAndDemo();

  const [packetMode, setPacketMode] = useState<'create' | 'append'>('create');
  const [targetExamId, setTargetExamId] = useState<string>('');
  const [managedServerPackets, setManagedServerPackets] = useState<ManagedPacketRow[]>([]);

  // Exam Packet Config
  const [title, setTitle] = useState('UTS Semester Ganjil - Matematika Kelas X');
  const [examType, setExamType] = useState<CbtExamType>('UTS');
  const [level, setLevel] = useState<'SMP' | 'SMA'>('SMA');
  const [gradeLevel, setGradeLevel] = useState<number>(10);
  const [subjectName, setSubjectName] = useState('Matematika');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(3);
  const [dynamicToken, setDynamicToken] = useState<string>(() => generateExamToken6('Matematika'));

  // Draft Questions inside the active packet
  const [draftQuestions, setDraftQuestions] = useState<ServerExamQuestion[]>([]);
  const [inputMethod, setInputMethod] = useState<'manual' | 'bulk' | 'ai'>('manual');

  // Manual Editor State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qTopic, setQTopic] = useState('Konsep Inti');
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState<string>('');
  const [optTexts, setOptTexts] = useState<Record<string, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
    E: '',
  });
  const [correctOptionId, setCorrectOptionId] = useState<string>('A');
  const [qWeight, setQWeight] = useState<number>(2);

  // Bulk Import State
  const [bulkStatus, setBulkStatus] = useState<{
    ok: boolean;
    message: string;
    errors: string[];
  } | null>(null);

  // AI HOTS State
  const [aiTopicHint, setAiTopicHint] = useState('');

  // Save Feedback
  const [isSavingPacket, setIsSavingPacket] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; token?: string } | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadManagePackets = async () => {
    try {
      const res = await fetch('/api/cbt/manage');
      if (res.ok) {
        const data = (await res.json()) as ManagedPacketRow[];
        if (Array.isArray(data)) {
          setManagedServerPackets(data);
        }
      }
    } catch {
      // keep existing state
    }
  };

  useEffect(() => {
    loadManagePackets();
  }, []);

  // Merge active packets with tokens/questions from customExamPackets + managedServerPackets
  const mergedPackets: ManagedPacketRow[] = React.useMemo(() => {
    const map = new Map<string, ManagedPacketRow>();
    for (const p of customExamPackets) {
      map.set(p.id, {
        id: p.id,
        title: p.title,
        examType: p.examType,
        level: p.level,
        subjectName: p.subjectName,
        gradeLevel: p.gradeLevel,
        durationMinutes: p.durationMinutes,
        maxTabSwitches: p.maxTabSwitches,
        questionCount: p.questions.length,
        dynamicToken: p.dynamicToken,
        questions: p.questions,
      });
    }
    for (const s of managedServerPackets) {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      } else {
        const existing = map.get(s.id)!;
        map.set(s.id, {
          ...s,
          ...existing,
          dynamicToken: existing.dynamicToken || s.dynamicToken,
          questionCount: Math.max(existing.questionCount, s.questionCount),
        });
      }
    }
    for (const a of activeExamPackets) {
      if (!map.has(a.id)) {
        map.set(a.id, {
          id: a.id,
          title: a.title,
          examType: a.examType,
          level: a.level || (a.gradeLevel <= 9 ? 'SMP' : 'SMA'),
          subjectName: a.subjectName,
          gradeLevel: a.gradeLevel,
          durationMinutes: a.durationMinutes,
          maxTabSwitches: a.maxTabSwitches,
          questionCount: a.questionCount,
        });
      }
    }
    return Array.from(map.values());
  }, [customExamPackets, managedServerPackets, activeExamPackets]);

  useEffect(() => {
    if (!targetExamId && mergedPackets.length > 0) {
      setTargetExamId(mergedPackets[0].id);
    }
  }, [mergedPackets, targetExamId]);

  const handleSelectImageFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Lampiran soal harus berupa berkas gambar (PNG/JPG/WEBP).' });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setQImageUrl(dataUrl);
    } catch {
      setFeedback({ type: 'error', text: 'Gagal membaca berkas gambar lampiran.' });
    }
  };

  const resetManualForm = () => {
    setEditingQuestionId(null);
    setQTopic(subjectName ? `${subjectName} - Konsep` : 'Konsep Inti');
    setQText('');
    setQImageUrl('');
    setOptTexts({ A: '', B: '', C: '', D: '', E: '' });
    setCorrectOptionId('A');
    setQWeight(2);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleAddOrUpdateManualQuestion = () => {
    if (!qText.trim()) {
      setFeedback({ type: 'error', text: 'Teks pertanyaan soal wajib diisi.' });
      return;
    }
    const filledOptions = OPTION_LETTERS.map((letter) => ({
      id: letter,
      text: (optTexts[letter] || '').trim(),
    })).filter((o) => o.text.length > 0);

    if (filledOptions.length < 2) {
      setFeedback({ type: 'error', text: 'Minimal isi 2 opsi jawaban (disarankan lengkap A sampai E).' });
      return;
    }

    const safeCorrect = filledOptions.some((o) => o.id === correctOptionId)
      ? correctOptionId
      : filledOptions[0].id;

    const item: ServerExamQuestion = {
      id: editingQuestionId || `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      topic: qTopic.trim() || subjectName || 'Umum',
      questionText: qText.trim(),
      imageUrl: qImageUrl || undefined,
      options: filledOptions,
      correctOptionId: safeCorrect,
      weight: Number.isFinite(qWeight) && qWeight > 0 ? qWeight : 1,
    };

    setDraftQuestions((prev) =>
      editingQuestionId ? prev.map((q) => (q.id === editingQuestionId ? item : q)) : [...prev, item]
    );
    setFeedback({
      type: 'success',
      text: editingQuestionId
        ? 'Butir soal berhasil diperbarui pada tabel pratinjau.'
        : '1 butir soal manual berhasil ditambahkan ke paket ujian.',
    });
    resetManualForm();
  };

  const handleEditDraftQuestion = (q: ServerExamQuestion) => {
    setInputMethod('manual');
    setEditingQuestionId(q.id);
    setQTopic(q.topic);
    setQText(q.questionText);
    setQImageUrl(q.imageUrl || '');
    const nextOpts: Record<string, string> = { A: '', B: '', C: '', D: '', E: '' };
    q.options.forEach((o) => {
      nextOpts[o.id] = o.text;
    });
    setOptTexts(nextOpts);
    setCorrectOptionId(q.correctOptionId);
    setQWeight(q.weight || 1);
  };

  const handleDeleteDraftQuestion = (qId: string) => {
    setDraftQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const handleBulkFileUpload = (file: File | null) => {
    if (!file) return;
    setBulkStatus(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = parseQuestionBankFile(content, file.name);
      if (result.questions.length > 0) {
        setDraftQuestions((prev) => [...prev, ...result.questions]);
        setBulkStatus({
          ok: true,
          message: `Berhasil mengimpor ${result.questions.length} soal (${result.format.toUpperCase()}) dari "${file.name}" ke tabel pratinjau.`,
          errors: result.errors,
        });
      } else {
        setBulkStatus({
          ok: false,
          message: `Tidak ada soal valid yang dapat diimpor dari "${file.name}".`,
          errors: result.errors,
        });
      }
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setBulkStatus({
        ok: false,
        message: 'Gagal membaca file bank soal dari perangkat.',
        errors: [],
      });
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = (format: 'csv' | 'json' | 'txt') => {
    const tpl = buildQuestionTemplateFile(format, subjectName || 'Matematika');
    const blob = new Blob([tpl.content], { type: tpl.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tpl.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleGenerate5Hots = () => {
    const generated = generateHotsCbtQuestions({
      subjectName: subjectName || 'Matematika',
      level,
      gradeLevel,
      topicHint: aiTopicHint,
    });
    setDraftQuestions((prev) => [...prev, ...generated]);
    setFeedback({
      type: 'success',
      text: `5 soal HOTS ${subjectName} (${level} Kelas ${gradeLevel}) berhasil dibuat dan dimasukkan ke pratinjau!`,
    });
  };

  const handleSaveAndActivatePacket = async () => {
    setFeedback(null);
    if (draftQuestions.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Tambahkan minimal 1 butir soal (Manual, Import File, atau Generator AI HOTS) sebelum mengaktifkan paket.',
      });
      return;
    }

    setIsSavingPacket(true);
    try {
      if (packetMode === 'append') {
        if (!targetExamId) {
          setFeedback({ type: 'error', text: 'Pilih paket ujian tujuan terlebih dahulu.' });
          return;
        }
        await appendQuestionsToExamPacket(targetExamId, draftQuestions, roleProfile.personName);
        const target = mergedPackets.find((p) => p.id === targetExamId);
        await loadManagePackets();
        setDraftQuestions([]);
        setFeedback({
          type: 'success',
          text: `${draftQuestions.length} soal baru ditambahkan ke paket "${target?.title || targetExamId}" dan langsung aktif untuk Siswa!`,
          token: target?.dynamicToken,
        });
      } else {
        if (!title.trim()) {
          setFeedback({ type: 'error', text: 'Judul Paket Ujian wajib diisi.' });
          return;
        }
        const cleanToken = dynamicToken.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (cleanToken.length < 4) {
          setFeedback({ type: 'error', text: 'Token ujian minimal 4–6 karakter alfanumerik.' });
          return;
        }

        const slugId = `${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 32)}-${Date.now().toString(36).slice(-4)}`;

        const newPacket: StoredExamPacket = {
          id: slugId,
          title: title.trim(),
          examType,
          level,
          subjectName: subjectName.trim() || 'Umum',
          gradeLevel,
          durationMinutes: Math.max(5, durationMinutes || 60),
          maxTabSwitches: Math.max(1, maxTabSwitches || 3),
          questionCount: draftQuestions.length,
          requireSeb: false,
          dynamicToken: cleanToken,
          questions: draftQuestions,
          createdBy: roleProfile.personName,
          createdAt: new Date().toISOString(),
        };

        const saved = await saveExamPacket(newPacket);
        await loadManagePackets();
        setDraftQuestions([]);
        setDynamicToken(generateExamToken6(subjectName));
        setFeedback({
          type: 'success',
          text: `Paket ujian "${saved.title}" (${saved.questionCount} soal) telah diaktifkan! Siswa & Pengawas langsung dapat mengaksesnya.`,
          token: saved.dynamicToken,
        });
      }
    } finally {
      setIsSavingPacket(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Mode & Feedback */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">
              MANAJEMEN UJIAN & BANK SOAL CBT
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Susun Paket Ujian, Import Bank Soal & Aktivasi Token Real-Time
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Paket ujian yang diaktifkan langsung tersinkronisasi ke Lobi CBT Siswa dan Pusat Komando Pengawas (Proctor).
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPacketMode('create')}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                packetMode === 'create' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buat Paket Ujian Baru
            </button>
            <button
              type="button"
              onClick={() => setPacketMode('append')}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                packetMode === 'append' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tambah ke Paket yang Ada
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${
                  feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              />
              <span>{feedback.text}</span>
              {feedback.token && (
                <span className="ml-1 rounded bg-white px-2 py-0.5 font-mono font-bold text-slate-900 border border-emerald-200">
                  TOKEN: {feedback.token}
                </span>
              )}
            </div>
            {feedback.type === 'success' && (
              <div className="flex items-center gap-3">
                <Link to="/cbt" className="font-bold text-brand-primary underline whitespace-nowrap">
                  Buka Lobi CBT Siswa →
                </Link>
                <Link to="/dashboard/proctor" className="font-bold text-slate-700 underline whitespace-nowrap">
                  Pantau di Proctor →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Packet Configuration Form */}
        {packetMode === 'create' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="cbt-exam-title" className="block text-xs font-semibold text-slate-700">
                Judul Paket Ujian
              </label>
              <input
                id="cbt-exam-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: UTS Semester Ganjil - Matematika Kelas X"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cbt-exam-type" className="block text-xs font-semibold text-slate-700">
                Jenis Ujian
              </label>
              <select
                id="cbt-exam-type"
                value={examType}
                onChange={(e) => setExamType(e.target.value as CbtExamType)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cbt-exam-subject" className="block text-xs font-semibold text-slate-700">
                Mata Pelajaran
              </label>
              <input
                id="cbt-exam-subject"
                list="cbt-subject-list"
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
              <datalist id="cbt-subject-list">
                {SUBJECT_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="cbt-exam-level" className="block text-xs font-semibold text-slate-700">
                Jenjang
              </label>
              <select
                id="cbt-exam-level"
                value={level}
                onChange={(e) => {
                  const nextLvl = e.target.value as 'SMP' | 'SMA';
                  setLevel(nextLvl);
                  setGradeLevel(nextLvl === 'SMP' ? 8 : 10);
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>

            <div>
              <label htmlFor="cbt-exam-grade" className="block text-xs font-semibold text-slate-700">
                Kelas
              </label>
              <select
                id="cbt-exam-grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                {(level === 'SMP' ? [7, 8, 9] : [10, 11, 12]).map((g) => (
                  <option key={g} value={g}>
                    Kelas {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cbt-exam-duration" className="block text-xs font-semibold text-slate-700">
                Durasi (Menit)
              </label>
              <input
                id="cbt-exam-duration"
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="cbt-exam-maxtab" className="block text-xs font-semibold text-slate-700">
                Batas Pindah Tab (Anti-Cheat)
              </label>
              <input
                id="cbt-exam-maxtab"
                type="number"
                min={1}
                max={10}
                value={maxTabSwitches}
                onChange={(e) => setMaxTabSwitches(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-brand-primary shrink-0" />
                <div>
                  <label htmlFor="cbt-exam-token" className="block text-xs font-bold text-slate-800">
                    Token Ujian 6 Digit (Dibagikan ke Siswa saat Ujian Dimulai)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Token otomatis terhubung ke Ruang Ujian Siswa & Pusat Kontrol Pengawas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cbt-exam-token"
                  type="text"
                  maxLength={6}
                  value={dynamicToken}
                  onChange={(e) => setDynamicToken(e.target.value.toUpperCase())}
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg font-extrabold tracking-widest text-slate-900 uppercase"
                />
                <button
                  type="button"
                  onClick={() => setDynamicToken(generateExamToken6(subjectName))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary whitespace-nowrap"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Acak Token 6-Digit</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <label htmlFor="cbt-target-packet" className="block text-xs font-bold text-slate-800">
              Pilih Paket Ujian Aktif Tujuan
            </label>
            <select
              id="cbt-target-packet"
              value={targetExamId}
              onChange={(e) => setTargetExamId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900"
            >
              {mergedPackets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.examType} · Kelas {p.gradeLevel} · {p.questionCount} soal
                  {p.dynamicToken ? ` · Token: ${p.dynamicToken}` : ''})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* 3 Question Input Methods + Live Preview */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: 3 Methods */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Metode Input & Upload Soal CBT</h3>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {([
                { id: 'manual', label: '1. Input Manual' },
                { id: 'bulk', label: '2. Import CSV/JSON/TXT' },
                { id: 'ai', label: '3. Generator HOTS' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setInputMethod(m.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    inputMethod === m.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Method 1: Manual Visual Question Editor */}
          {inputMethod === 'manual' && (
            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Topik / Kompetensi Dasar</label>
                  <input
                    type="text"
                    value={qTopic}
                    onChange={(e) => setQTopic(e.target.value)}
                    placeholder="Contoh: Persamaan Kuadrat & Diskriminan"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bobot Nilai</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={qWeight}
                    onChange={(e) => setQWeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Teks Pertanyaan / Wacana Soal
                </label>
                <textarea
                  rows={3}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Tuliskan pertanyaan ujian CBT secara lengkap (mendukung wacana panjang)..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Optional Image Attachment */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">Lampiran Gambar Soal (Opsional)</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelectImageFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-primary"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Pilih Gambar</span>
                    </button>
                    {qImageUrl && (
                      <button
                        type="button"
                        onClick={() => setQImageUrl('')}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Hapus Gambar
                      </button>
                    )}
                  </div>
                </div>
                {qImageUrl && (
                  <img
                    src={qImageUrl}
                    alt="Pratinjau lampiran soal"
                    className="max-h-32 rounded-lg border border-slate-200 object-contain bg-white"
                  />
                )}
              </div>

              {/* 5 Options A-E + Correct Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Opsi Jawaban (A–E) & Kunci Benar</span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    Kunci Dipilih: {correctOptionId}
                  </span>
                </div>
                {OPTION_LETTERS.map((letter) => (
                  <div key={letter} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectOptionId(letter)}
                      aria-label={`Jadikan opsi ${letter} sebagai kunci jawaban`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors ${
                        correctOptionId === letter
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-brand-primary'
                      }`}
                    >
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={optTexts[letter] || ''}
                      onChange={(e) => setOptTexts((prev) => ({ ...prev, [letter]: e.target.value }))}
                      placeholder={`Teks opsi ${letter}${letter === 'E' ? ' (opsional jika 4 opsi)' : ''}`}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddOrUpdateManualQuestion}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-brand-primary-fg hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  <span>{editingQuestionId ? 'Simpan Perubahan Soal' : 'Tambahkan Butir Soal ke Paket'}</span>
                </button>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={resetManualForm}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Method 2: Bulk Import CSV / JSON / TXT */}
          {inputMethod === 'bulk' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleBulkFileUpload(e.dataTransfer.files?.[0] || null);
                }}
                onClick={() => bulkFileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition-colors hover:border-brand-primary hover:bg-brand-primary/5"
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".csv,.json,.txt,text/csv,application/json,text/plain"
                  onChange={(e) => handleBulkFileUpload(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <UploadCloud className="mx-auto h-9 w-9 text-brand-primary" />
                <p className="mt-2 text-sm font-bold text-slate-900">
                  📤 Unggah File Bank Soal (.csv / .json / .txt)
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Klik atau seret berkas bank soal dari komputer untuk langsung mem-parsing puluhan soal ke pratinjau.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileSpreadsheet className="h-4 w-4 text-brand-primary" />
                  <span>Unduh Template Soal Siap Pakai</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Gunakan salah satu format template di bawah ini agar struktur kolom opsi A–E, kunci, dan bobot langsung terbaca otomatis.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['csv', 'json', 'txt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleDownloadTemplate(fmt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh Template .{fmt.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {bulkStatus && (
                <div
                  className={`rounded-xl border p-3.5 text-xs space-y-1 ${
                    bulkStatus.ok
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  <p className="font-bold">{bulkStatus.message}</p>
                  {bulkStatus.errors.length > 0 && (
                    <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                      {bulkStatus.errors.slice(0, 4).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Method 3: AI / Preset 5 HOTS Questions Generator */}
          {inputMethod === 'ai' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Sparkles className="h-5 w-5" />
                  <h4 className="text-sm font-bold text-slate-900">Generator Cepat 5 Soal HOTS CBT</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Secara otomatis merakit 5 butir soal HOTS pilihan ganda (A–E) lengkap dengan kunci jawaban dan bobot nilai sesuai mata pelajaran{' '}
                  <strong>{subjectName}</strong> ({level} Kelas {gradeLevel}).
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Fokus Topik / Bab Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={aiTopicHint}
                    onChange={(e) => setAiTopicHint(e.target.value)}
                    placeholder="Contoh: Fungsi Kuadrat, Keamanan Jaringan, atau Fotosintesis"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerate5Hots}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-xs font-bold text-brand-primary-fg hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>✨ Bantu Buat 5 Soal HOTS Otomatis</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right: Preview Question Table & Activate Button */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Paket Soal Ujian ({draftQuestions.length} Soal)
                </h3>
                <p className="text-xs text-slate-500">
                  Periksa kunci jawaban & bobot nilai sebelum mengaktifkan ujian ke Siswa.
                </p>
              </div>
              {draftQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftQuestions([])}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Kosongkan Draf
                </button>
              )}
            </div>

            {draftQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
                <p className="text-sm font-bold text-slate-800">Belum Ada Soal di Draf Paket Ini</p>
                <p className="text-xs text-slate-500">
                  Tambahkan soal secara manual, unggah file CSV/JSON/TXT, atau klik{' '}
                  <strong>"✨ Bantu Buat 5 Soal HOTS Otomatis"</strong> untuk simulasi cepat.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                {draftQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-bold text-slate-500">
                        NO. {idx + 1} · {q.topic} · Bobot {q.weight} ·{' '}
                        <span className="text-emerald-700">Kunci: {q.correctOptionId}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditDraftQuestion(q)}
                          aria-label={`Edit soal nomor ${idx + 1}`}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:text-brand-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraftQuestion(q.id)}
                          aria-label={`Hapus soal nomor ${idx + 1}`}
                          className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {q.questionText}
                    </p>

                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt={`Lampiran soal ${idx + 1}`}
                        className="max-h-24 rounded-lg border border-slate-200 bg-white object-contain"
                      />
                    )}

                    <div className="grid gap-1.5 sm:grid-cols-2 text-[11px]">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`rounded-lg border px-2.5 py-1.5 ${
                            opt.id === q.correctOptionId
                              ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <span className="font-mono font-bold mr-1">{opt.id}.</span>
                          {opt.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isSavingPacket}
              onClick={handleSaveAndActivatePacket}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3.5 text-sm font-bold text-brand-primary-fg shadow-xs hover:opacity-90 disabled:opacity-60"
            >
              <Megaphone className="h-4 w-4" />
              <span>
                {isSavingPacket
                  ? 'Menyimpan & Mengaktifkan...'
                  : packetMode === 'append'
                  ? '📢 Tambahkan Soal ke Paket Ujian Aktif'
                  : '📢 Simpan & Aktifkan Paket Ujian'}
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Active CBT Packets Repository Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daftar Paket Ujian CBT Terdaftar ({mergedPackets.length} Paket Aktif)
            </h3>
            <p className="text-xs text-slate-500">
              Seluruh paket di bawah ini tersedia secara real-time di Lobi Ujian Siswa dan Dashboard Pengawas.
            </p>
          </div>
          <Link
            to="/cbt"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-brand-primary"
          >
            Lihat Tampilan Lobi Siswa →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 pr-4">Judul Paket Ujian</th>
                <th className="py-2.5 px-3">Jenis & Kelas</th>
                <th className="py-2.5 px-3">Mapel</th>
                <th className="py-2.5 px-3 text-right">Soal</th>
                <th className="py-2.5 px-3 text-right">Durasi</th>
                <th className="py-2.5 px-3">Token Ujian</th>
                <th className="py-2.5 pl-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mergedPackets.map((pkt) => (
                <tr key={pkt.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{pkt.title}</td>
                  <td className="py-3 px-3 text-xs text-slate-600">
                    {pkt.examType} · {pkt.level} Kls {pkt.gradeLevel}
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-700">{pkt.subjectName}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                    {pkt.questionCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                    {pkt.durationMinutes}m
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                    {pkt.dynamicToken || 'UJIAN26'}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setPacketMode('append');
                        setTargetExamId(pkt.id);
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary whitespace-nowrap"
                    >
                      + Tambah Soal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

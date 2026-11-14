import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Gamepad2, PlusCircle, Save, UploadCloud } from 'lucide-react';
import { SEED_REPORT_CARD } from '../lib/seed-data';
import type { GameEngineType, ReportCardDTO, SubjectGradeRow } from '../types/lms';

const DEFAULT_GAME_TEMPLATE = JSON.stringify(
  {
    subtitle: 'Kuis Interaktif Buatan Guru Mapel',
    microLearningSummary: 'Pelajari ringkasan konsep sebelum menjawab soal.',
    questions: [
      {
        id: 'custom-1',
        question: 'Berapakah hasil dari 2^5 dalam sistem bilangan biner?',
        options: [
          { id: 'A', text: '16' },
          { id: 'B', text: '32' },
          { id: 'C', text: '64' },
          { id: 'D', text: '128' },
        ],
        correctId: 'B',
        ustadzHint: 'Kalikan 2 sebanyak 5 kali.',
        jamaahPoll: { A: 10, B: 75, C: 10, D: 5 },
        rewardTier: 'Poin Utama',
      },
    ],
  },
  null,
  2
);

export function TeacherDashboardPage() {
  const [tab, setTab] = useState<'gradebook' | 'game_builder' | 'material'>('gradebook');
  const [rapor, setRapor] = useState<ReportCardDTO>(SEED_REPORT_CARD);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Game Builder state
  const [gameTitle, setGameTitle] = useState('Kuis Bilangan Biner & Logika');
  const [gameSubject, setGameSubject] = useState('Informatika');
  const [gameLevel, setGameLevel] = useState<'SMP' | 'SMA'>('SMA');
  const [gameGrade, setGameGrade] = useState(10);
  const [gameEngine, setGameEngine] = useState<GameEngineType>('MILLIONAIRE_QUIZ');
  const [gameJson, setGameJson] = useState(DEFAULT_GAME_TEMPLATE);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  // Material Uploader state
  const [matTitle, setMatTitle] = useState('');
  const [matSubject, setMatSubject] = useState('Informatika');
  const [matType, setMatType] = useState<'MODUL_PDF' | 'INTERACTIVE_LKPD' | 'ARTICLE_BLOG'>('MODUL_PDF');
  const [matSummary, setMatSummary] = useState('');

  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
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
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
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
          actorName: 'Ustadz Hendra, M.Pd',
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

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: gameTitle,
        creatorName: 'Ustadz Hendra, M.Pd',
        subjectCode: gameSubject.slice(0, 3).toUpperCase(),
        subjectName: gameSubject,
        level: gameLevel,
        gradeLevel: gameGrade,
        engineType: gameEngine,
        configJson: gameJson,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setCreatedSlug(created.slug);
      showToast(`Game "${created.title}" berhasil dipublikasikan ke Katalog!`);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'Gagal menyimpan game.');
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim() || !matSummary.trim()) return;
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: matTitle,
        authorName: 'Ustadz Hendra, M.Pd',
        subjectName: matSubject,
        level: 'SMA',
        gradeLevel: 10,
        materialType: matType,
        summary: matSummary,
        contentMarkdown: matSummary,
      }),
    });
    if (res.ok) {
      setMatTitle('');
      setMatSummary('');
      showToast('Materi ajar berhasil diunggah ke Perpustakaan Digital.');
    }
  };

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">PORTAL GURU & KREATOR KONTEN</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Studio Guru · Ustadz Hendra, M.Pd
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: 'gradebook', label: 'Buku Nilai Otomatis' },
            { id: 'game_builder', label: 'JSON Game Builder' },
            { id: 'material', label: 'Unggah Materi' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3.5 py-2 text-xs font-semibold ${
                tab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
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

      {tab === 'game_builder' && (
        <form
          onSubmit={handleCreateGame}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-brand-primary" />
            <h2 className="text-lg font-bold text-slate-900">Pembuat Game Edukasi Berbasis JSON</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Judul Game</label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Mata Pelajaran</label>
              <input
                type="text"
                value={gameSubject}
                onChange={(e) => setGameSubject(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Engine Game</label>
              <select
                value={gameEngine}
                onChange={(e) => setGameEngine(e.target.value as GameEngineType)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="MILLIONAIRE_QUIZ">Millionaire Quiz</option>
                <option value="SWIPE_CARD">Swipe Card</option>
                <option value="IFP_TOWER_BATTLE">IFP Tower Battle</option>
                <option value="TURN_BASED_ARENA">Turn-Based Arena</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Jenjang</label>
              <select
                value={gameLevel}
                onChange={(e) => setGameLevel(e.target.value as 'SMP' | 'SMA')}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Kelas</label>
              <input
                type="number"
                min={7}
                max={12}
                value={gameGrade}
                onChange={(e) => setGameGrade(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Konfigurasi Soal & Aturan (JSON)
            </label>
            <textarea
              rows={11}
              value={gameJson}
              onChange={(e) => setGameJson(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs text-emerald-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-fg hover:opacity-90"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Publikasikan Game</span>
            </button>
            {createdSlug && (
              <Link
                to={`/games/${createdSlug}`}
                className="text-sm font-semibold text-brand-primary underline"
              >
                Mainkan Game yang Baru Dibuat
              </Link>
            )}
          </div>
        </form>
      )}

      {tab === 'material' && (
        <form
          onSubmit={handleCreateMaterial}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 max-w-2xl"
        >
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-brand-primary" />
            <h2 className="text-lg font-bold text-slate-900">Unggah Modul Ajar & LKPD</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Judul Materi</label>
            <input
              type="text"
              required
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="Contoh: Modul Ajar Struktur Data Graf"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Mata Pelajaran</label>
              <input
                type="text"
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
            <label className="block text-xs font-semibold text-slate-700">Ringkasan & Isi Modul</label>
            <textarea
              rows={5}
              required
              value={matSummary}
              onChange={(e) => setMatSummary(e.target.value)}
              placeholder="Tuliskan ringkasan materi atau instruksi LKPD..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-fg hover:opacity-90"
          >
            Terbitkan ke Perpustakaan
          </button>
        </form>
      )}
    </div>
  );
}

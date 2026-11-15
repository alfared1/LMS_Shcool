import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileCheck2, KeyRound, ShieldCheck } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { verifyLocalPacketTokenAndCreateSession } from '../lib/cbt-sync';
import type { ExamPacketSummary } from '../types/lms';

const FALLBACK_DEFAULT_EXAM: ExamPacketSummary = {
  id: 'uas-informatika-2026',
  title: 'Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital',
  examType: 'UAS',
  level: 'SMA',
  subjectName: 'Informatika & Literasi Digital',
  gradeLevel: 10,
  durationMinutes: 60,
  maxTabSwitches: 3,
  questionCount: 5,
  requireSeb: false,
};

export function CbtLobbyPage() {
  const { roleProfile, config, activeExamPackets, customExamPackets, refreshExamPackets } =
    useTenantAndDemo();
  const navigate = useNavigate();

  const availableExams =
    activeExamPackets.length > 0 ? activeExamPackets : [FALLBACK_DEFAULT_EXAM];

  const [selectedExamId, setSelectedExamId] = useState<string>(availableExams[0].id);
  const [token, setToken] = useState('');
  const [sebChecked, setSebChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshExamPackets();
  }, [refreshExamPackets]);

  useEffect(() => {
    if (availableExams.length > 0 && !availableExams.some((e) => e.id === selectedExamId)) {
      setSelectedExamId(availableExams[0].id);
    }
  }, [availableExams, selectedExamId]);

  const primaryExam =
    availableExams.find((e) => e.id === selectedExamId) || availableExams[0] || FALLBACK_DEFAULT_EXAM;

  const studentName = roleProfile.role === 'STUDENT' ? roleProfile.personName : 'Ahmad Fauzi';
  const studentNisn = '0084921034';
  const classroomName = 'X-IPA-1';

  const handleEnterExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Masukkan Token 6-Digit dari Pengawas Ruang / Guru terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const normalizedToken = token.trim().toUpperCase();
      let handled = false;
      try {
        const res = await fetch('/api/cbt/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: primaryExam.id,
            token: normalizedToken,
            studentName,
            studentNisn,
            classroomName,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          handled = true;
          navigate(`/cbt/${primaryExam.id}/room`);
          return;
        }
        if (res.status !== 404 && data?.error) {
          // Check if local custom packet has matching updated token before rejecting
          const localMatch = customExamPackets.find((p) => p.id === primaryExam.id);
          if (!localMatch || localMatch.dynamicToken.toUpperCase() !== normalizedToken) {
            setError(data.error || 'Token ujian tidak valid.');
            handled = true;
            return;
          }
        }
      } catch {
        // fallback to local packet check
      }

      if (!handled) {
        const localPacket = customExamPackets.find((p) => p.id === primaryExam.id);
        if (localPacket) {
          const localResult = verifyLocalPacketTokenAndCreateSession({
            packet: localPacket,
            token: normalizedToken,
            studentName,
            studentNisn,
            classroomName,
          });
          if (!localResult.ok) {
            setError(localResult.error || 'Token ujian tidak valid.');
            return;
          }
          navigate(`/cbt/${primaryExam.id}/room`);
          return;
        }
        setError('Token ujian tidak valid atau paket ujian tidak ditemukan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold text-brand-primary">
          EVALUASI RESMI · {config.schoolName}
        </p>
        <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">
          Lobi Ujian CBT Berintegritas Tinggi
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Pilih paket ujian aktif di bawah ini, lalu masukkan Token 6-Digit dari Pengawas Ruang / Guru untuk memasuki Mode Fokus Zen Lockdown.
        </p>
      </div>

      {/* Selectable Active Exam Packets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Daftar Ujian CBT Aktif ({availableExams.length} Paket Tersedia)
          </h2>
          <span className="text-xs text-slate-500">Klik kartu ujian untuk memilih sesi</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {availableExams.map((exam) => {
            const isSelected = exam.id === primaryExam.id;
            const isCustom = customExamPackets.some((p) => p.id === exam.id);
            return (
              <button
                key={exam.id}
                type="button"
                onClick={() => {
                  setSelectedExamId(exam.id);
                  setError(null);
                }}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-brand-primary">
                    {exam.examType} · {exam.level || (exam.gradeLevel <= 9 ? 'SMP' : 'SMA')} Kelas {exam.gradeLevel}
                  </span>
                  {isCustom && (
                    <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Paket Baru Guru
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm sm:text-base font-bold text-slate-900">{exam.title}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
                  <span>{exam.subjectName}</span>
                  <span>·</span>
                  <span>{exam.durationMinutes} mnt</span>
                  <span>·</span>
                  <span>{exam.questionCount} soal</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-brand-primary">
                {primaryExam.examType} · {primaryExam.level || (primaryExam.gradeLevel <= 9 ? 'SMP' : 'SMA')} Kelas {primaryExam.gradeLevel}
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{primaryExam.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">Mata Pelajaran: {primaryExam.subjectName}</p>
            </div>
            <FileCheck2 className="h-6 w-6 shrink-0 text-brand-primary" />
          </div>

          <div className="grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-sm">
            <div>
              <span className="block text-xs text-slate-500">Durasi</span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-mono font-bold tabular-nums text-slate-900">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {primaryExam.durationMinutes} mnt
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Jumlah Soal</span>
              <span className="mt-0.5 block font-mono font-bold tabular-nums text-slate-900">
                {primaryExam.questionCount} Soal
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Batas Pindah Tab</span>
              <span className="mt-0.5 block font-mono font-bold tabular-nums text-slate-900">
                Maks {primaryExam.maxTabSwitches}x
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Pemeriksaan Kesiapan Sistem (SEB & Lockdown)</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sebChecked}
                onChange={(e) => setSebChecked(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-primary"
              />
              <span>
                Saya siap mengikuti ujian dalam Mode Layar Penuh dan menonaktifkan Asisten AI Tutor selama ujian berlangsung.
              </span>
            </label>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Pengacakan soal deterministik & penyimpanan otomatis per klik aktif.</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleEnterExam}
          className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <KeyRound className="h-5 w-5 text-brand-primary" />
              <h3 className="text-base font-bold">Validasi Token Ruang</h3>
            </div>

            <div>
              <label htmlFor="cbt-token-input" className="block text-xs font-semibold text-slate-700">
                Token Ujian 6-Digit (Contoh default UAS: UJIAN26)
              </label>
              <input
                id="cbt-token-input"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="UJIAN26"
                maxLength={8}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 uppercase focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !sebChecked}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{submitting ? 'Memverifikasi...' : 'Masuk Ruang Ujian'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

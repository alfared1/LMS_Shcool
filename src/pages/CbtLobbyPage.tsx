import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, KeyRound, ShieldCheck } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import type { ExamPacketSummary } from '../types/lms';

export function CbtLobbyPage() {
  const { roleProfile, config } = useTenantAndDemo();
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamPacketSummary[]>([]);
  const [token, setToken] = useState('');
  const [sebChecked, setSebChecked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/cbt/exams')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setExams(data);
      })
      .catch(() => undefined);
  }, []);

  const primaryExam = exams[0] || {
    id: 'uas-informatika-2026',
    title: 'Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital',
    examType: 'UAS',
    subjectName: 'Informatika & Literasi Digital',
    gradeLevel: 10,
    durationMinutes: 60,
    maxTabSwitches: 3,
    questionCount: 5,
    requireSeb: false,
  };

  const handleEnterExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Masukkan Token 6-Digit dari Pengawas Ruang terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cbt/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: primaryExam.id,
          token: token.trim().toUpperCase(),
          studentName: roleProfile.role === 'STUDENT' ? roleProfile.personName : 'Ahmad Fauzi',
          studentNisn: '0084921034',
          classroomName: 'X-IPA-1',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Token ujian tidak valid.');
        return;
      }
      navigate(`/cbt/${primaryExam.id}/room`);
    } catch {
      setError('Gagal menghubungi server ujian. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold text-brand-primary">
          EVALUASI RESMI · {config.schoolName}
        </p>
        <h1 className="mt-1.5 text-3xl font-extrabold text-slate-900">
          Lobi Ujian CBT Berintegritas Tinggi
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Masukkan Token 6-Digit dari Pengawas Ruang untuk memasuki Mode Fokus Zen Lockdown.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <span className="text-xs font-semibold text-brand-primary">
              {primaryExam.examType} · Kelas {primaryExam.gradeLevel}
            </span>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{primaryExam.title}</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-sm">
            <div>
              <span className="block text-xs text-slate-500">Durasi</span>
              <span className="mt-0.5 inline-flex items-center gap-1 font-mono font-bold text-slate-900">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {primaryExam.durationMinutes} mnt
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Jumlah Soal</span>
              <span className="mt-0.5 block font-mono font-bold text-slate-900">
                {primaryExam.questionCount} HOTS
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Batas Pindah Tab</span>
              <span className="mt-0.5 block font-mono font-bold text-slate-900">
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
                Token Ujian (Contoh default: UJIAN26)
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

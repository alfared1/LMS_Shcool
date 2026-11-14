import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, Send } from 'lucide-react';
import { ZenLockdownHeader } from '../components/cbt/ZenLockdownHeader';
import { QuestionNavigatorGrid } from '../components/cbt/QuestionNavigatorGrid';
import { ViolationShieldModal } from '../components/cbt/ViolationShieldModal';
import type { ClientExamQuestion, ExamAttemptDTO } from '../types/lms';

export function CbtRoomPage() {
  const { examId = 'uas-informatika-2026' } = useParams<{ examId: string }>();
  const [attempt, setAttempt] = useState<ExamAttemptDTO | null>(null);
  const [questions, setQuestions] = useState<ClientExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(3600);
  const [syncStatus, setSyncStatus] = useState<'Tersimpan' | 'Menyimpan...' | 'Offline Cache'>('Tersimpan');
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [violationOpen, setViolationOpen] = useState(false);
  const [violationReason, setViolationReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const saveTimerRef = useRef<number | null>(null);
  const attemptRef = useRef<ExamAttemptDTO | null>(null);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/cbt/session/${examId}?nisn=0084921034`);
      if (!res.ok) {
        setErrorMsg('Sesi ujian belum dimulai. Silakan masukkan Token Ujian di Lobi CBT.');
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { attempt: ExamAttemptDTO; questions: ClientExamQuestion[] };
      setAttempt(data.attempt);
      setQuestions(data.questions);
      setAnswers(data.attempt.answers || {});
      setFlaggedIds(data.attempt.flaggedIds || []);
      const diffSec = Math.max(
        0,
        Math.floor((new Date(data.attempt.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diffSec);
      setLoading(false);
    } catch {
      setErrorMsg('Gagal memuat ruang ujian CBT.');
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Server-Authoritative countdown tick
  useEffect(() => {
    if (!attempt || attempt.submittedAt) return;
    const t = window.setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
    }, 1000);
    return () => window.clearInterval(t);
  }, [attempt]);

  // Anti-Cheating Visibility Listener
  const triggerViolation = useCallback(
    async (type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'WINDOW_BLUR', detail: string) => {
      const curr = attemptRef.current;
      if (!curr || curr.submittedAt || curr.isLockedByProctor) return;
      setViolationReason(detail);
      setViolationOpen(true);
      try {
        const res = await fetch(`/api/cbt/attempts/${curr.id}/violation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, detail }),
        });
        if (res.ok) {
          const updated = (await res.json()) as ExamAttemptDTO;
          setAttempt(updated);
        }
      } catch {
        // ignore network error
      }
    },
    []
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('TAB_SWITCH', 'Terdeteksi berpindah tab atau meminimalkan jendela ujian.');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [triggerViolation]);

  const persistAnswers = useCallback(
    (nextAnswers: Record<string, string>, nextFlagged: string[]) => {
      const curr = attemptRef.current;
      if (!curr) return;
      localStorage.setItem(`cbt_cache_${curr.id}`, JSON.stringify({ nextAnswers, nextFlagged }));
      setSyncStatus('Menyimpan...');
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        try {
          const res = await fetch(`/api/cbt/attempts/${curr.id}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: nextAnswers, flaggedIds: nextFlagged }),
          });
          setSyncStatus(res.ok ? 'Tersimpan' : 'Offline Cache');
        } catch {
          setSyncStatus('Offline Cache');
        }
      }, 250);
    },
    []
  );

  const handleSelectAnswer = (qId: string, optId: string) => {
    if (attempt?.submittedAt || attempt?.isLockedByProctor) return;
    const nextAnswers = { ...answers, [qId]: optId };
    setAnswers(nextAnswers);
    persistAnswers(nextAnswers, flaggedIds);
  };

  const handleToggleFlag = (qId: string) => {
    const nextFlagged = flaggedIds.includes(qId)
      ? flaggedIds.filter((id) => id !== qId)
      : [...flaggedIds, qId];
    setFlaggedIds(nextFlagged);
    persistAnswers(answers, nextFlagged);
  };

  const handleEnterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore if headless browser blocks fullscreen
    }
    setViolationOpen(false);
  };

  const handleSubmitExam = async () => {
    if (!attempt) return;
    const res = await fetch(`/api/cbt/attempts/${attempt.id}/submit`, { method: 'POST' });
    if (res.ok) {
      const submitted = (await res.json()) as ExamAttemptDTO;
      setAttempt(submitted);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Memuat ruang ujian CBT...
      </div>
    );
  }

  if (errorMsg || !attempt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">{errorMsg || 'Sesi tidak ditemukan'}</h1>
        <Link
          to="/cbt"
          className="mt-4 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-fg"
        >
          Kembali ke Lobi CBT
        </Link>
      </div>
    );
  }

  if (attempt.submittedAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Ujian CBT Berhasil Dikumpulkan</h1>
          <p className="mt-2 text-sm text-slate-600">
            {attempt.examTitle} · {attempt.studentName} ({attempt.classroomName})
          </p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <span className="block text-xs font-semibold text-slate-500">Nilai Akhir (Evaluasi Server)</span>
            <span className="mt-1 block font-mono text-4xl font-extrabold text-brand-primary tabular-nums">
              {attempt.finalScore ?? 0}
            </span>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/dashboard/student"
              className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-fg"
            >
              Kembali ke Dashboard Siswa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const fontSizeClass =
    fontScale === 'sm' ? 'text-sm' : fontScale === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className="min-h-screen bg-slate-50">
      <ZenLockdownHeader
        examTitle={attempt.examTitle}
        classroomName={attempt.classroomName}
        secondsLeft={secondsLeft}
        syncStatus={syncStatus}
        violationCount={attempt.violationCount}
        maxViolations={attempt.maxTabSwitches}
        onEnterFullscreen={handleEnterFullscreen}
      />

      <main className="mx-auto grid max-w-[1360px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Question Area */}
        <section className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between">
          {currentQ && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-primary">
                    SOAL NO. {currentIndex + 1} DARI {questions.length}
                  </span>
                  <p className="text-xs text-slate-500">Topik: {currentQ.topic}</p>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {([
                    { id: 'sm', label: 'A-' },
                    { id: 'md', label: 'A' },
                    { id: 'lg', label: 'A+' },
                  ] as const).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setFontScale(sz.id)}
                      aria-label={`Ukuran teks ${sz.label}`}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        fontScale === sz.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className={`mt-6 font-medium leading-relaxed text-slate-900 ${fontSizeClass}`}>
                {currentQ.questionText}
              </p>

              <div className="mt-6 space-y-3">
                {currentQ.options.map((opt, idx) => {
                  const letter = ['A', 'B', 'C', 'D', 'E'][idx] || opt.id;
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
                      className={`flex min-h-[56px] w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/10 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                          isSelected
                            ? 'bg-brand-primary text-brand-primary-fg'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className={fontSizeClass}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>

            {currentQ && (
              <button
                type="button"
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  flaggedIds.includes(currentQ.id)
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Flag className="h-4 w-4" />
                <span>Ragu-ragu</span>
              </button>
            )}

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-primary-fg hover:opacity-90"
              >
                <span>Selanjutnya</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitExam}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" />
                <span>Selesai & Kumpulkan</span>
              </button>
            )}
          </div>
        </section>

        {/* Navigator Grid */}
        <div className="lg:col-span-4 space-y-4">
          <QuestionNavigatorGrid
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            flaggedIds={flaggedIds}
            violationCount={attempt.violationCount}
            maxViolations={attempt.maxTabSwitches}
            onSelectIndex={setCurrentIndex}
          />
          <button
            type="button"
            onClick={() =>
              triggerViolation(
                'TAB_SWITCH',
                'Simulasi pelanggaran pindah tab / keluar fokus ujian.'
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-800"
          >
            Simulasikan Deteksi Pindah Tab (Demo Anti-Cheating)
          </button>
        </div>
      </main>

      <ViolationShieldModal
        isOpen={violationOpen}
        isLockedByProctor={attempt.isLockedByProctor}
        violationCount={attempt.violationCount}
        maxViolations={attempt.maxTabSwitches}
        reasonText={violationReason}
        onResumeExam={handleEnterFullscreen}
        onRefreshStatus={loadSession}
      />
    </div>
  );
}

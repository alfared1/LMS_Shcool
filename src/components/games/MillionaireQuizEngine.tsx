import { useState, useEffect, useCallback, useRef } from 'react';
import { Calculator, HelpCircle, Pause, RotateCcw, Snowflake, Sparkles, Users, BookOpen } from 'lucide-react';
import { GameContainerShell } from './GameContainerShell';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { playTone } from '../../lib/sound-fx';

interface MillionaireQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctId: string;
  ustadzHint: string;
  jamaahPoll: Record<string, number>;
  rewardTier: string;
}

interface MillionaireConfig {
  subtitle: string;
  microLearningSummary: string;
  questions: MillionaireQuestion[];
}

interface Props {
  title: string;
  subjectName: string;
  config: MillionaireConfig;
  autostart: boolean;
  onComplete: (score: number, durationSeconds: number) => void;
}

type ModeType = 'NORMAL' | 'CEPAT' | 'MARATHON';

export function MillionaireQuizEngine({ title, subjectName, config, autostart, onComplete }: Props) {
  const { isMuted } = useTenantAndDemo();
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [mode, setMode] = useState<ModeType>('NORMAL');
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);

  // 5 Lifelines
  const [used5050, setUsed5050] = useState(false);
  const [usedDoubleChance, setUsedDoubleChance] = useState(false);
  const [doubleChanceActive, setDoubleChanceActive] = useState(false);
  const [usedJamaah, setUsedJamaah] = useState(false);
  const [usedUstadz, setUsedUstadz] = useState(false);
  const [usedFreeze, setUsedFreeze] = useState(false);

  const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'retry'; text: string } | null>(null);

  // Zakat 2.5% Nisab Calculator
  const [showCalc, setShowCalc] = useState(false);
  const [wealthInput, setWealthInput] = useState(200000000);
  const [goldPricePerGram, setGoldPricePerGram] = useState(1400000);

  const questions = config.questions || [];
  const currentQ = questions[qIndex];
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) {
        window.clearTimeout(id);
      }
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const startGame = useCallback(
    (selectedMode: ModeType = mode) => {
      for (const id of timeoutsRef.current) {
        window.clearTimeout(id);
      }
      timeoutsRef.current = [];
      setMode(selectedMode);
      setQIndex(0);
      setScore(0);
      setCorrectCount(0);
      setTimeLeft(selectedMode === 'CEPAT' ? 10 : selectedMode === 'NORMAL' ? 60 : 999);
      setTotalElapsed(0);
      setIsFrozen(false);
      setUsed5050(false);
      setUsedDoubleChance(false);
      setDoubleChanceActive(false);
      setUsedJamaah(false);
      setUsedUstadz(false);
      setUsedFreeze(false);
      setEliminatedIds([]);
      setShowPoll(false);
      setShowHint(false);
      setFeedback(null);
      setGameState('playing');
      playTone('click', isMuted);
    },
    [mode, isMuted]
  );

  useEffect(() => {
    if (gameState !== 'title') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startGame(mode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, mode, startGame]);

  useEffect(() => {
    if (gameState !== 'playing' || feedback?.type === 'correct' || feedback?.type === 'wrong') return;
    const timer = window.setInterval(() => {
      setTotalElapsed((t) => t + 1);
      if (mode !== 'MARATHON' && !isFrozen) {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameState, mode, isFrozen, feedback]);

  useEffect(() => {
    if (gameState !== 'playing' || mode === 'MARATHON' || isFrozen) return;
    if (timeLeft <= 0) {
      playTone('wrong', isMuted);
      setGameState('gameover');
      onComplete(score, totalElapsed);
    }
  }, [gameState, mode, isFrozen, timeLeft, isMuted, onComplete, score, totalElapsed]);

  const advanceOrFinish = (nextScore: number, wasCorrect: boolean) => {
    const tId = window.setTimeout(() => {
      if (!wasCorrect) {
        setGameState('gameover');
        onComplete(nextScore, totalElapsed);
        return;
      }
      if (qIndex + 1 >= questions.length) {
        playTone('victory', isMuted);
        setGameState('gameover');
        onComplete(nextScore, totalElapsed);
      } else {
        setQIndex((i) => i + 1);
        setTimeLeft(mode === 'CEPAT' ? 10 : mode === 'NORMAL' ? 60 : 999);
        setIsFrozen(false);
        setDoubleChanceActive(false);
        setEliminatedIds([]);
        setShowPoll(false);
        setShowHint(false);
        setFeedback(null);
      }
    }, 900);
    timeoutsRef.current.push(tId);
  };

  const handleSelectOption = (optionId: string) => {
    if (!currentQ || eliminatedIds.includes(optionId) || feedback?.type === 'correct' || feedback?.type === 'wrong') {
      return;
    }

    if (optionId === currentQ.correctId) {
      playTone('correct', isMuted);
      const bonus = mode === 'CEPAT' ? 30 : mode === 'MARATHON' ? 25 : 20;
      const nextScore = score + bonus;
      setScore(nextScore);
      setCorrectCount((c) => c + 1);
      setFeedback({ type: 'correct', text: `Benar! ${currentQ.rewardTier}` });
      advanceOrFinish(nextScore, true);
    } else if (doubleChanceActive) {
      playTone('swipe', isMuted);
      setDoubleChanceActive(false);
      setEliminatedIds((prev) => [...prev, optionId]);
      setFeedback({ type: 'retry', text: 'Jawaban belum tepat — gunakan kesempatan kedua Anda!' });
    } else {
      playTone('wrong', isMuted);
      setFeedback({ type: 'wrong', text: `Kurang tepat. Jawaban benar adalah opsi ${currentQ.correctId}.` });
      advanceOrFinish(score, false);
    }
  };

  const useLifeline5050 = () => {
    if (used5050 || !currentQ || mode === 'MARATHON') return;
    const wrongOptions = currentQ.options.filter((o) => o.id !== currentQ.correctId).slice(0, 2).map((o) => o.id);
    setEliminatedIds((prev) => [...prev, ...wrongOptions]);
    setUsed5050(true);
    playTone('click', isMuted);
  };

  const useLifelineDouble = () => {
    if (usedDoubleChance || mode === 'MARATHON') return;
    setUsedDoubleChance(true);
    setDoubleChanceActive(true);
    playTone('click', isMuted);
  };

  const useLifelineJamaah = () => {
    if (usedJamaah || mode === 'MARATHON') return;
    setUsedJamaah(true);
    setShowPoll(true);
    playTone('click', isMuted);
  };

  const useLifelineUstadz = () => {
    if (usedUstadz || mode === 'MARATHON') return;
    setUsedUstadz(true);
    setShowHint(true);
    playTone('click', isMuted);
  };

  const useLifelineFreeze = () => {
    if (usedFreeze || mode === 'MARATHON') return;
    setUsedFreeze(true);
    setIsFrozen(true);
    playTone('click', isMuted);
  };

  const nisabThreshold = 85 * goldPricePerGram;
  const isWajibZakat = wealthInput >= nisabThreshold;
  const zakatAmount = isWajibZakat ? Math.round(wealthInput * 0.025) : 0;

  return (
    <GameContainerShell
      title={title}
      subjectName={subjectName}
      score={score}
      timerText={gameState === 'playing' ? (mode === 'MARATHON' ? '∞' : `${timeLeft}s`) : undefined}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6 sm:px-6">
        {gameState === 'title' && (
          <div className="grid gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-400">ARENA KUIS FIQIH ZAKAT</p>
                <h2 className="mt-2 text-3xl font-extrabold text-white">{title}</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{config.subtitle}</p>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <BookOpen className="h-4 w-4" />
                    <span>Ringkasan Materi Sebelum Bermain</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                    {config.microLearningSummary}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Pilih Mode Tantangan</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {([
                      { id: 'NORMAL', label: 'Normal', desc: '60s · 5 Bantuan' },
                      { id: 'CEPAT', label: 'Mode Cepat', desc: '10s · Poin Tinggi' },
                      { id: 'MARATHON', label: 'Marathon', desc: 'Tanpa Bantuan' },
                    ] as const).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          mode === m.id
                            ? 'border-emerald-500 bg-emerald-500/15 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="block text-sm font-bold">{m.label}</span>
                        <span className="block text-[11px] text-slate-400">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startGame(mode)}
                  className="arcade-btn rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Mulai Kuis Muzakki
                </button>
                <span className="text-xs text-slate-400">Tekan Enter / Spasi untuk mulai</span>
              </div>
            </div>

            {/* Zakat Calculator Tool */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center gap-2 text-amber-400">
                <Calculator className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">Kalkulator Nisab Zakat 2,5%</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Alat bantu simulasi sebelum menjawab soal hitungan zakat.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Total Harta Bersih (Rp)
                  </label>
                  <input
                    type="number"
                    value={wealthInput}
                    onChange={(e) => setWealthInput(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">
                    Harga Emas / gram (Rp)
                  </label>
                  <input
                    type="number"
                    value={goldPricePerGram}
                    onChange={(e) => setGoldPricePerGram(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                  />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batas Nisab (85 gr):</span>
                    <span className="font-mono font-semibold text-slate-200">
                      Rp {nisabThreshold.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status Kewajiban:</span>
                    <span className={`font-semibold ${isWajibZakat ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {isWajibZakat ? 'Wajib Zakat' : 'Belum Wajib'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-300 font-semibold">Zakat (2,5%):</span>
                    <span className="font-mono text-base font-bold text-amber-400">
                      Rp {zakatAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && currentQ && (
          <div className="space-y-5">
            {/* Progress & Lifelines Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-amber-400">
                  SOAL {qIndex + 1} / {questions.length}
                </span>
                <span className="text-xs text-slate-400">· {currentQ.rewardTier}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={used5050 || mode === 'MARATHON'}
                  onClick={useLifeline5050}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-35"
                >
                  50:50
                </button>
                <button
                  type="button"
                  disabled={usedDoubleChance || mode === 'MARATHON'}
                  onClick={useLifelineDouble}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-35"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>2x Kesempatan</span>
                </button>
                <button
                  type="button"
                  disabled={usedJamaah || mode === 'MARATHON'}
                  onClick={useLifelineJamaah}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-35"
                >
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>Tanya Jamaah</span>
                </button>
                <button
                  type="button"
                  disabled={usedUstadz || mode === 'MARATHON'}
                  onClick={useLifelineUstadz}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-35"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Tanya Ustadz</span>
                </button>
                <button
                  type="button"
                  disabled={usedFreeze || mode === 'MARATHON'}
                  onClick={useLifelineFreeze}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-35"
                >
                  <Snowflake className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Freeze</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalc((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Kalkulator Zakat</span>
                </button>
              </div>
            </div>

            {showCalc && (
              <div className="rounded-xl border border-amber-500/30 bg-slate-900 p-4 grid sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-xs text-slate-300">Harta Bersih (Rp)</label>
                  <input
                    type="number"
                    value={wealthInput}
                    onChange={(e) => setWealthInput(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Nisab 85gr Emas</label>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-200">
                    Rp {nisabThreshold.toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-300">Hasil Zakat (2,5%)</label>
                  <p className="mt-1 font-mono text-base font-bold text-amber-400">
                    Rp {zakatAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}

            {/* Question Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
              {isFrozen && (
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                  <Pause className="h-3.5 w-3.5" />
                  <span>Waktu Dihentikan Sementara (Freeze Aktif)</span>
                </p>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                {currentQ.question}
              </h2>

              {showHint && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-sm text-emerald-200">
                  <strong className="font-semibold">Petunjuk Ustadz:</strong> {currentQ.ustadzHint}
                </div>
              )}

              {showPoll && (
                <div className="mt-4 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3.5">
                  <p className="text-xs font-semibold text-sky-300 mb-2">Hasil Polling Jamaah</p>
                  <div className="grid grid-cols-4 gap-2">
                    {currentQ.options.map((opt) => (
                      <div key={opt.id} className="rounded-lg bg-slate-950 p-2 text-center">
                        <span className="block font-mono text-xs text-slate-400">Opsi {opt.id}</span>
                        <span className="font-mono text-sm font-bold text-sky-400">
                          {currentQ.jamaahPoll[opt.id] ?? 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {currentQ.options.map((opt) => {
                  const eliminated = eliminatedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={eliminated}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`arcade-btn flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all ${
                        eliminated
                          ? 'border-slate-800 bg-slate-950/40 text-slate-600 opacity-40 cursor-not-allowed'
                          : 'border-slate-700 bg-slate-800 text-white hover:border-emerald-400 hover:bg-slate-700'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono text-sm font-bold text-amber-400">
                        {opt.id}
                      </span>
                      <span className="text-sm sm:text-base font-medium">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div
                  className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                    feedback.type === 'correct'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : feedback.type === 'retry'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-red-500/40 bg-red-500/15 text-red-300'
                  }`}
                >
                  {feedback.text}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-amber-400">
              {correctCount === questions.length ? 'JUARA MUZAKKI UTAMA' : 'SESI SELESAI'}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Hasil Permainan Kuis</h2>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">Skor Akhir</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">{score}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">Benar</span>
                <span className="font-mono text-2xl font-bold text-white">
                  {correctCount}/{questions.length}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="block text-xs text-slate-400">Durasi</span>
                <span className="font-mono text-2xl font-bold text-sky-400">{totalElapsed}s</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Skor otomatis tercatat ke rekap penilaian guru mata pelajaran.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={() => startGame(mode)}
                className="arcade-btn inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Main Lagi</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </GameContainerShell>
  );
}

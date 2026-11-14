import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Sparkles, Swords } from 'lucide-react';
import { GameContainerShell } from './GameContainerShell';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { playTone } from '../../lib/sound-fx';

interface ArenaQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctId: string;
  ihsanHint: string;
}

interface ArenaConfig {
  subtitle: string;
  turnDurationSeconds: number;
  teamA: { name: string; role: string };
  teamB: { name: string; role: string };
  questions: ArenaQuestion[];
}

interface Props {
  title: string;
  subjectName: string;
  config: ArenaConfig;
  autostart: boolean;
  onComplete: (score: number, durationSeconds: number) => void;
}

export function TurnBasedArenaEngine({ title, subjectName, config, autostart, onComplete }: Props) {
  const { isMuted } = useTenantAndDemo();
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [turn, setTurn] = useState<'A' | 'B'>('A');
  const [qIdx, setQIdx] = useState(0);
  const [hpA, setHpA] = useState(100);
  const [hpB, setHpB] = useState(100);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [turnTimer, setTurnTimer] = useState(config.turnDurationSeconds || 20);
  const [ihsanUsedA, setIhsanUsedA] = useState(false);
  const [ihsanUsedB, setIhsanUsedB] = useState(false);
  const [ihsanActive, setIhsanActive] = useState(false);
  const [banner, setBanner] = useState('Giliran Kelompok Mitokondria menyerang!');

  const questions = config.questions || [];
  const currentQ = questions[qIdx % Math.max(questions.length, 1)];

  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setTurn('A');
    setQIdx(0);
    setHpA(100);
    setHpB(100);
    setScoreA(0);
    setScoreB(0);
    setTurnTimer(config.turnDurationSeconds || 20);
    setIhsanUsedA(false);
    setIhsanUsedB(false);
    setIhsanActive(false);
    setBanner(`Giliran ${config.teamA.name} menjawab!`);
    setGameState('playing');
    playTone('click', isMuted);
  }, [config.turnDurationSeconds, config.teamA.name, isMuted]);

  const switchTurn = useCallback(
    (nextQIdx: number) => {
      setTurn((t) => {
        const nextTurn = t === 'A' ? 'B' : 'A';
        setBanner(
          `Giliran ${nextTurn === 'A' ? config.teamA.name : config.teamB.name} menjawab!`
        );
        return nextTurn;
      });
      setQIdx(nextQIdx);
      setTurnTimer(config.turnDurationSeconds || 20);
      setIhsanActive(false);
    },
    [config.teamA.name, config.teamB.name, config.turnDurationSeconds]
  );

  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = window.setInterval(() => {
      setTurnTimer((prev) => {
        if (prev <= 1) {
          playTone('wrong', isMuted);
          switchTurn(qIdx + 1);
          return config.turnDurationSeconds || 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [gameState, isMuted, qIdx, switchTurn, config.turnDurationSeconds]);

  const handleUseIhsan = () => {
    if (turn === 'A' && ihsanUsedA) return;
    if (turn === 'B' && ihsanUsedB) return;
    if (turn === 'A') setIhsanUsedA(true);
    else setIhsanUsedB(true);
    setIhsanActive(true);
    playTone('click', isMuted);
  };

  const handleAnswer = (optId: string) => {
    if (gameState !== 'playing' || !currentQ) return;
    const isCorrect = optId === currentQ.correctId;
    const damage = ihsanActive ? 35 : 25;

    if (isCorrect) {
      playTone('correct', isMuted);
      if (turn === 'A') {
        const nextHpB = Math.max(0, hpB - damage);
        const nextScoreA = scoreA + (ihsanActive ? 35 : 25);
        setHpB(nextHpB);
        setScoreA(nextScoreA);
        if (nextHpB <= 0 || qIdx + 1 >= questions.length) {
          playTone('victory', isMuted);
          setGameState('gameover');
          onComplete(Math.max(nextScoreA, scoreB), 60);
          return;
        }
      } else {
        const nextHpA = Math.max(0, hpA - damage);
        const nextScoreB = scoreB + (ihsanActive ? 35 : 25);
        setHpA(nextHpA);
        setScoreB(nextScoreB);
        if (nextHpA <= 0 || qIdx + 1 >= questions.length) {
          playTone('victory', isMuted);
          setGameState('gameover');
          onComplete(Math.max(scoreA, nextScoreB), 60);
          return;
        }
      }
    } else {
      playTone('wrong', isMuted);
      if (qIdx + 1 >= questions.length) {
        setGameState('gameover');
        onComplete(Math.max(scoreA, scoreB), 60);
        return;
      }
    }

    switchTurn(qIdx + 1);
  };

  const winner =
    hpA > hpB || scoreA > scoreB
      ? config.teamA.name
      : hpB > hpA || scoreB > scoreA
      ? config.teamB.name
      : 'Seri';

  return (
    <GameContainerShell
      title={title}
      subjectName={subjectName}
      score={Math.max(scoreA, scoreB)}
      timerText={gameState === 'playing' ? `${turnTimer}s` : undefined}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6">
        {gameState === 'title' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-emerald-400">KUIS KELOMPOK BERGILIR · BIOLOGI SEL</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-300">{config.subtitle}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-left">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="font-bold text-emerald-300">{config.teamA.name}</p>
                <p className="text-xs text-slate-300">{config.teamA.role}</p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="font-bold text-sky-300">{config.teamB.name}</p>
                <p className="text-xs text-slate-300">{config.teamB.role}</p>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-7 rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-slate-950"
            >
              Mulai Arena Pertarungan
            </button>
          </div>
        )}

        {gameState === 'playing' && currentQ && (
          <div className="flex flex-1 flex-col justify-between gap-4">
            {/* Top HP & Turn Status */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div
                className={`rounded-xl border p-4 transition-colors ${
                  turn === 'A'
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/50 opacity-75'
                }`}
              >
                <div className="flex justify-between text-sm font-bold text-emerald-300">
                  <span>{config.teamA.name}</span>
                  <span className="font-mono tabular-nums">{hpA} HP · {scoreA} pts</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${hpA}%` }} />
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 transition-colors ${
                  turn === 'B'
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-slate-800 bg-slate-950/50 opacity-75'
                }`}
              >
                <div className="flex justify-between text-sm font-bold text-sky-300">
                  <span>{config.teamB.name}</span>
                  <span className="font-mono tabular-nums">{hpB} HP · {scoreB} pts</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${hpB}%` }} />
                </div>
              </div>
            </div>

            {/* Prompt & Kartu Ihsan */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Swords className="h-4 w-4" />
                  <span>{banner}</span>
                </div>
                <button
                  type="button"
                  disabled={(turn === 'A' ? ihsanUsedA : ihsanUsedB) || ihsanActive}
                  onClick={handleUseIhsan}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gunakan Kartu Ihsan (+Damage & Petunjuk)</span>
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                {currentQ.question}
              </h2>

              {ihsanActive && (
                <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <strong>Kartu Ihsan:</strong> {currentQ.ihsanHint}
                </div>
              )}

              {/* Bottom Touch-Friendly Grid */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQ.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAnswer(opt.id)}
                    className="arcade-btn flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-5 py-5 text-left text-white hover:border-emerald-400 hover:bg-slate-700"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 font-mono text-base font-bold text-amber-400">
                      {opt.id}
                    </span>
                    <span className="text-base sm:text-lg font-semibold">{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-amber-400">ARENA SELESAI</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Pemenang: {winner}</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-emerald-300">{config.teamA.name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">{scoreA} poin</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-sky-300">{config.teamB.name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">{scoreB} poin</p>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Main Lagi</span>
            </button>
          </div>
        )}
      </div>
    </GameContainerShell>
  );
}

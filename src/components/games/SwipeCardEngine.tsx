import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Heart, RotateCcw, X } from 'lucide-react';
import { GameContainerShell } from './GameContainerShell';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { playTone } from '../../lib/sound-fx';

interface SwipeCardItem {
  id: string;
  title: string;
  relation: string;
  answer: 'LEFT' | 'RIGHT';
  explanation: string;
}

interface SwipeConfig {
  subtitle: string;
  leftLabel: string;
  rightLabel: string;
  kitabSummary: string;
  cards: SwipeCardItem[];
}

interface Props {
  title: string;
  subjectName: string;
  config: SwipeConfig;
  autostart: boolean;
  onComplete: (score: number, durationSeconds: number) => void;
}

export function SwipeCardEngine({ title, subjectName, config, autostart, onComplete }: Props) {
  const { isMuted } = useTenantAndDemo();
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [cardIdx, setCardIdx] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showKitab, setShowKitab] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const cards = config.cards || [];
  const currentCard = cards[cardIdx];

  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setCardIdx(0);
    setHearts(3);
    setCombo(0);
    setScore(0);
    setElapsed(0);
    setLastFeedback(null);
    setGameState('playing');
    playTone('click', isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [gameState]);

  const handleSwipe = useCallback(
    (dir: 'LEFT' | 'RIGHT') => {
      if (gameState !== 'playing' || !currentCard) return;

      const isCorrect = currentCard.answer === dir;
      let nextScore = score;
      let nextHearts = hearts;

      if (isCorrect) {
        const nextCombo = combo + 1;
        nextScore = score + 15 * nextCombo;
        setCombo(nextCombo);
        setScore(nextScore);
        setLastFeedback({ ok: true, text: `Tepat (Combo x${nextCombo}): ${currentCard.explanation}` });
        playTone('correct', isMuted);
      } else {
        nextHearts = hearts - 1;
        setCombo(0);
        setHearts(nextHearts);
        setLastFeedback({ ok: false, text: `Keliru: ${currentCard.explanation}` });
        playTone('wrong', isMuted);
      }

      if (nextHearts <= 0 || cardIdx + 1 >= cards.length) {
        if (nextHearts > 0) playTone('victory', isMuted);
        setGameState('gameover');
        onComplete(nextScore, elapsed);
      } else {
        setCardIdx((i) => i + 1);
      }
    },
    [gameState, currentCard, score, hearts, combo, cardIdx, cards.length, isMuted, onComplete, elapsed]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
      } else if (gameState === 'playing') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleSwipe('LEFT');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleSwipe('RIGHT');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, startGame, handleSwipe]);

  return (
    <GameContainerShell
      title={title}
      subjectName={subjectName}
      score={score}
      timerText={gameState === 'playing' ? `${elapsed}s` : undefined}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6">
        {gameState === 'title' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-amber-400">KLASIFIKASI KILAT · SWIPE CARD</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-300">{config.subtitle}</p>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-left text-sm text-slate-300 leading-relaxed">
              {config.kitabSummary}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="arcade-btn rounded-xl bg-emerald-500 px-7 py-3 text-sm font-bold text-slate-950"
              >
                Mulai Klasifikasi
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Gunakan tombol panah Kiri / Kanan atau klik tombol pilihan
            </p>
          </div>
        )}

        {gameState === 'playing' && currentCard && (
          <div className="space-y-5">
            {/* Status Bar */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-1.5" aria-label={`Sisa nyawa: ${hearts}`}>
                {[1, 2, 3].map((n) => (
                  <Heart
                    key={n}
                    className={`h-5 w-5 ${
                      n <= hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                COMBO x{Math.max(1, combo)} · KARTU {cardIdx + 1}/{cards.length}
              </span>
              <button
                type="button"
                onClick={() => setShowKitab(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <span>Kitab Ringkas</span>
              </button>
            </div>

            {/* Active Swipe Card */}
            <div className="rounded-2xl border-2 border-slate-700 bg-slate-900 p-8 text-center shadow-xl">
              <p className="text-xs font-semibold text-slate-400">{currentCard.relation}</p>
              <h3 className="mt-3 text-3xl font-extrabold text-white">{currentCard.title}</h3>
              <p className="mt-4 text-sm text-slate-400">
                Tentukan statusnya terhadap seorang Muslim/Muslimah:
              </p>

              <div className="mt-7 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSwipe('LEFT')}
                  className="arcade-btn flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-4 text-sm sm:text-base font-bold text-white hover:bg-rose-500"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>{config.leftLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwipe('RIGHT')}
                  className="arcade-btn flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-sm sm:text-base font-bold text-white hover:bg-emerald-500"
                >
                  <span>{config.rightLabel}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {lastFeedback && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  lastFeedback.ok
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                }`}
              >
                {lastFeedback.text}
              </div>
            )}
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-emerald-400">
              {hearts > 0 ? 'MISI TUNTAS' : 'NYAWA HABIS'}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Ringkasan Misi Mahram</h2>
            <p className="mt-3 font-mono text-3xl font-bold text-amber-400">{score} Poin</p>
            <p className="mt-2 text-sm text-slate-400">
              Sisa Nyawa: {hearts}/3 · Waktu: {elapsed} detik
            </p>
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

        {showKitab && (
          <div
            role="dialog"
            aria-label="Kitab Ringkas Mahram"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Kitab Ringkas Fiqih Mahram</h3>
                <button
                  type="button"
                  onClick={() => setShowKitab(false)}
                  aria-label="Tutup Kitab Ringkas"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">{config.kitabSummary}</p>
            </div>
          </div>
        )}
      </div>
    </GameContainerShell>
  );
}

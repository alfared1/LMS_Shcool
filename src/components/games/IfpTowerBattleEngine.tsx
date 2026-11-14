import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Shield, Zap } from 'lucide-react';
import { GameContainerShell } from './GameContainerShell';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { playTone } from '../../lib/sound-fx';

interface ArabicPrompt {
  arabic: string;
  translit: string;
  meaning: string;
  category: 'MUDZAKKAR' | 'MUANNATS';
}

interface TowerBattleConfig {
  subtitle: string;
  durationSeconds: number;
  leftTeam: { name: string; targetCategory: 'MUDZAKKAR' | 'MUANNATS' };
  rightTeam: { name: string; targetCategory: 'MUDZAKKAR' | 'MUANNATS' };
  prompts: ArabicPrompt[];
}

interface Props {
  title: string;
  subjectName: string;
  config: TowerBattleConfig;
  autostart: boolean;
  onComplete: (score: number, durationSeconds: number) => void;
}

export function IfpTowerBattleEngine({ title, subjectName, config, autostart, onComplete }: Props) {
  const { isMuted } = useTenantAndDemo();
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [timeLeft, setTimeLeft] = useState(config.durationSeconds || 60);
  const [leftHp, setLeftHp] = useState(100);
  const [rightHp, setRightHp] = useState(100);
  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [laserSide, setLaserSide] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [statusBanner, setStatusBanner] = useState<string>('Ketuk tombol di separuh bawah layar untuk menembak menara lawan!');

  const prompts = config.prompts || [];
  const currentPrompt = prompts[promptIdx % Math.max(prompts.length, 1)];

  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setTimeLeft(config.durationSeconds || 60);
    setLeftHp(100);
    setRightHp(100);
    setLeftScore(0);
    setRightScore(0);
    setPromptIdx(0);
    setLaserSide(null);
    setStatusBanner('Tentukan apakah kosakata di atas Mudzakkar (Lk) atau Muannats (Pr)!');
    setGameState('playing');
    playTone('click', isMuted);
  }, [config.durationSeconds, isMuted]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          playTone('victory', isMuted);
          setGameState('gameover');
          onComplete(Math.max(leftScore, rightScore), config.durationSeconds || 60);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [gameState, isMuted, leftScore, rightScore, config.durationSeconds, onComplete]);

  const handleTeamTap = (team: 'LEFT' | 'RIGHT') => {
    if (gameState !== 'playing' || !currentPrompt) return;
    const expectedCategory =
      team === 'LEFT' ? config.leftTeam.targetCategory : config.rightTeam.targetCategory;
    const isCorrect = currentPrompt.category === expectedCategory;

    if (isCorrect) {
      playTone('laser', isMuted);
      setLaserSide(team);
      window.setTimeout(() => setLaserSide(null), 280);

      if (team === 'LEFT') {
        const nextHp = Math.max(0, rightHp - 20);
        const nextScore = leftScore + 25;
        setRightHp(nextHp);
        setLeftScore(nextScore);
        setStatusBanner(`${config.leftTeam.name} menembak tepat! "${currentPrompt.translit}" adalah Mudzakkar.`);
        if (nextHp <= 0) {
          playTone('victory', isMuted);
          setGameState('gameover');
          onComplete(nextScore, (config.durationSeconds || 60) - timeLeft);
          return;
        }
      } else {
        const nextHp = Math.max(0, leftHp - 20);
        const nextScore = rightScore + 25;
        setLeftHp(nextHp);
        setRightScore(nextScore);
        setStatusBanner(`${config.rightTeam.name} menembak tepat! "${currentPrompt.translit}" adalah Muannats.`);
        if (nextHp <= 0) {
          playTone('victory', isMuted);
          setGameState('gameover');
          onComplete(nextScore, (config.durationSeconds || 60) - timeLeft);
          return;
        }
      }
    } else {
      playTone('wrong', isMuted);
      if (team === 'LEFT') {
        setLeftHp((hp) => Math.max(10, hp - 10));
        setStatusBanner(`Meleset! "${currentPrompt.translit}" termasuk Muannats (memiliki Ta Marbuthah).`);
      } else {
        setRightHp((hp) => Math.max(10, hp - 10));
        setStatusBanner(`Meleset! "${currentPrompt.translit}" termasuk Mudzakkar.`);
      }
    }

    setPromptIdx((i) => i + 1);
  };

  const winnerName =
    leftHp > rightHp || leftScore > rightScore
      ? config.leftTeam.name
      : rightHp > leftHp || rightScore > leftScore
      ? config.rightTeam.name
      : 'Seri (Imbang)';

  return (
    <GameContainerShell
      title={title}
      subjectName={subjectName}
      score={Math.max(leftScore, rightScore)}
      timerText={gameState === 'playing' ? `${timeLeft}s` : undefined}
    >
      {gameState === 'title' && (
        <div className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-xs font-semibold text-sky-400">MODE LAYAR SENTUH KELAS (IFP 65–86")</p>
            <h2 className="mt-2 text-3xl font-extrabold text-white">{title}</h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">{config.subtitle}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-left">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-bold text-emerald-300">{config.leftTeam.name}</p>
                <p className="mt-1 text-xs text-slate-300">Ketuk zona kiri saat kata berbentuk Mudzakkar (maskulin).</p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <p className="text-sm font-bold text-sky-300">{config.rightTeam.name}</p>
                <p className="mt-1 text-xs text-slate-300">Ketuk zona kanan saat kata berakhiran Ta Marbuthah (Muannats).</p>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-7 rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-bold text-slate-950 hover:bg-emerald-400"
            >
              Mulai Pertempuran IFP
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && currentPrompt && (
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
          {/* TOP 45%: Visual Towers, Laser & Large Classroom Prompt */}
          <div className="grid grid-cols-12 gap-4 items-center rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 min-h-[38vh]">
            {/* Left Tower */}
            <div className="col-span-4 flex flex-col items-center">
              <div className="flex w-full items-center justify-between text-xs font-bold text-emerald-300 mb-1.5">
                <span>{config.leftTeam.name}</span>
                <span className="font-mono tabular-nums">{leftHp} HP</span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${leftHp}%` }}
                />
              </div>
              <div className="mt-4 flex flex-col items-center">
                <Shield className="h-16 w-16 text-emerald-400" />
                <span className="mt-1 font-mono text-sm font-bold text-white">Skor: {leftScore}</span>
              </div>
            </div>

            {/* Center Prompt + Laser */}
            <div className="col-span-4 relative flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 px-4 py-6 text-center">
              {laserSide && (
                <div
                  className={`absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${
                    laserSide === 'LEFT' ? 'bg-emerald-400' : 'bg-sky-400'
                  }`}
                />
              )}
              <span className="text-4xl sm:text-6xl font-bold text-white leading-tight" dir="rtl">
                {currentPrompt.arabic}
              </span>
              <span className="mt-3 text-xl sm:text-2xl font-bold text-amber-300">
                {currentPrompt.translit}
              </span>
              <span className="mt-1 text-sm text-slate-400">({currentPrompt.meaning})</span>
            </div>

            {/* Right Tower */}
            <div className="col-span-4 flex flex-col items-center">
              <div className="flex w-full items-center justify-between text-xs font-bold text-sky-300 mb-1.5">
                <span>{config.rightTeam.name}</span>
                <span className="font-mono tabular-nums">{rightHp} HP</span>
              </div>
              <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{ width: `${rightHp}%` }}
                />
              </div>
              <div className="mt-4 flex flex-col items-center">
                <Shield className="h-16 w-16 text-sky-400" />
                <span className="mt-1 font-mono text-sm font-bold text-white">Skor: {rightScore}</span>
              </div>
            </div>
          </div>

          <p className="my-2 text-center text-sm font-medium text-slate-300">{statusBanner}</p>

          {/* BOTTOM 55%: Ergonomic IFP Split-Screen Touch Action Zone */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-[240px]">
            <button
              type="button"
              onClick={() => handleTeamTap('LEFT')}
              className="arcade-btn flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-400/50 bg-emerald-600/25 p-6 text-center hover:bg-emerald-600/35"
            >
              <Zap className="h-10 w-10 text-emerald-300 mb-2" />
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {config.leftTeam.name}
              </span>
              <span className="mt-1 text-sm sm:text-base font-semibold text-emerald-200">
                TEMBAK (MUDZAKKAR)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTeamTap('RIGHT')}
              className="arcade-btn flex flex-col items-center justify-center rounded-2xl border-2 border-sky-400/50 bg-sky-600/25 p-6 text-center hover:bg-sky-600/35"
            >
              <Zap className="h-10 w-10 text-sky-300 mb-2" />
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {config.rightTeam.name}
              </span>
              <span className="mt-1 text-sm sm:text-base font-semibold text-sky-200">
                TEMBAK (MUANNATS)
              </span>
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-10 text-center">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-xs font-semibold text-amber-400">PERTEMPURAN SELESAI</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Pemenang: {winnerName}</h2>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-slate-950 p-4">
                <p className="text-xs text-emerald-300">{config.leftTeam.name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">{leftScore} poin</p>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-slate-950 p-4">
                <p className="text-xs text-sky-300">{config.rightTeam.name}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-white">{rightScore} poin</p>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Tanding Ulang</span>
            </button>
          </div>
        </div>
      )}
    </GameContainerShell>
  );
}

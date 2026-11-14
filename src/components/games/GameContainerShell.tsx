import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';

interface GameContainerShellProps {
  title: string;
  subjectName: string;
  score: number;
  timerText?: string;
  onToggleFullscreen?: () => void;
  children: React.ReactNode;
}

export function GameContainerShell({
  title,
  subjectName,
  score,
  timerText,
  children,
}: GameContainerShellProps) {
  const { isMuted, toggleMute } = useTenantAndDemo();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-screen flex-col bg-slate-950 text-slate-100"
    >
      {/* Compact Perimeter HUD */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/games"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Katalog</span>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-white sm:text-base">{title}</h1>
            <p className="truncate text-xs text-slate-400">{subjectName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {timerText && (
            <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-right">
              <span className="block text-[10px] font-semibold text-slate-400">WAKTU</span>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
                {timerText}
              </span>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-right">
            <span className="block text-[10px] font-semibold text-slate-400">SKOR</span>
            <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
              {Math.round(score)}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Aktifkan Audio Game' : 'Matikan Audio Game'}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Keluar Layar Penuh IFP' : 'Mode Layar Penuh IFP'}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Playfield */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

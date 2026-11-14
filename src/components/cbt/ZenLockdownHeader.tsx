import { CloudCheck, Maximize2, ShieldAlert } from 'lucide-react';
import { SchoolCrestLogo } from '../layout/SchoolCrestLogo';
import { formatCountdown } from '../../lib/core-logic';

interface Props {
  examTitle: string;
  classroomName: string;
  secondsLeft: number;
  syncStatus: 'Tersimpan' | 'Menyimpan...' | 'Offline Cache';
  violationCount: number;
  maxViolations: number;
  onEnterFullscreen: () => void;
}

export function ZenLockdownHeader({
  examTitle,
  classroomName,
  secondsLeft,
  syncStatus,
  violationCount,
  maxViolations,
  onEnterFullscreen,
}: Props) {
  const isCritical = secondsLeft <= 300;
  const isWarning = secondsLeft <= 900 && !isCritical;

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <SchoolCrestLogo className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-sm sm:text-base font-bold text-slate-900">
              {examTitle}
            </h1>
            <p className="text-xs text-slate-500">
              Mode Fokus Zen · Kelas {classroomName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div
            className={`rounded-lg border px-3 py-1.5 text-center ${
              isCritical
                ? 'border-red-300 bg-red-50 text-red-700'
                : isWarning
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-75">
              Sisa Waktu Server
            </span>
            <span className="font-mono text-base font-bold tabular-nums">
              {formatCountdown(secondsLeft)}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            <CloudCheck className="h-4 w-4 text-emerald-600" />
            <span>{syncStatus}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <ShieldAlert
              className={`h-4 w-4 ${violationCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}
            />
            <span className="font-mono tabular-nums">
              Pelanggaran: {violationCount}/{maxViolations}
            </span>
          </div>

          <button
            type="button"
            onClick={onEnterFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Layar Penuh</span>
          </button>
        </div>
      </div>
    </header>
  );
}

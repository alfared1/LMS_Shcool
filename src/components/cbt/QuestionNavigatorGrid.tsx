import { Check, Flag, Shield } from 'lucide-react';
import type { ClientExamQuestion } from '../../types/lms';

interface Props {
  questions: ClientExamQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: string[];
  violationCount: number;
  maxViolations: number;
  onSelectIndex: (idx: number) => void;
}

export function QuestionNavigatorGrid({
  questions,
  currentIndex,
  answers,
  flaggedIds,
  violationCount,
  maxViolations,
  onSelectIndex,
}: Props) {
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const flaggedCount = flaggedIds.length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Peta Nomor Soal</h2>
        <p className="mt-0.5 text-xs text-slate-500">Klik nomor untuk berpindah soal secara langsung</p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isFlagged = flaggedIds.includes(q.id);
          const isAnswered = Boolean(answers[q.id]);

          let style = 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400';
          if (isFlagged) {
            style = 'border-amber-400 bg-amber-50 text-amber-800';
          } else if (isAnswered) {
            style = 'border-emerald-500 bg-emerald-50 text-emerald-800';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              aria-label={`Soal nomor ${idx + 1}${isAnswered ? ', sudah dijawab' : ''}${isFlagged ? ', ragu-ragu' : ''}`}
              className={`relative flex h-11 items-center justify-center rounded-lg border font-mono text-sm font-bold transition-all ${style} ${
                isCurrent ? 'ring-2 ring-brand-primary ring-offset-1' : ''
              }`}
            >
              <span>{String(idx + 1).padStart(2, '0')}</span>
              {isFlagged && <Flag className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-600" />}
              {!isFlagged && isAnswered && (
                <Check className="absolute right-1 top-1 h-2.5 w-2.5 text-emerald-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Accessible Legend (Color + Icon + Text) */}
      <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>Dijawab</span>
          </span>
          <span className="font-mono font-bold text-slate-900">{answeredCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-amber-600" />
            <span>Ragu-ragu</span>
          </span>
          <span className="font-mono font-bold text-slate-900">{flaggedCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-slate-300 bg-slate-100" />
            <span>Belum Dijawab</span>
          </span>
          <span className="font-mono font-bold text-slate-900">{unansweredCount}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Shield className="h-4 w-4 text-brand-primary" />
          <span>Status Keamanan</span>
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">
          Pelanggaran Tercatat: {violationCount} / {maxViolations}
        </p>
      </div>
    </aside>
  );
}

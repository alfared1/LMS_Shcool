import { Lock, Maximize2, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isLockedByProctor: boolean;
  violationCount: number;
  maxViolations: number;
  reasonText: string;
  onResumeExam: () => void;
  onRefreshStatus: () => void;
}

export function ViolationShieldModal({
  isOpen,
  isLockedByProctor,
  violationCount,
  maxViolations,
  reasonText,
  onResumeExam,
  onRefreshStatus,
}: Props) {
  if (!isOpen && !isLockedByProctor) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Peringatan Keamanan Ujian CBT"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 sm:p-8 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            isLockedByProctor ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isLockedByProctor ? <Lock className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-slate-900">
          {isLockedByProctor
            ? 'Sesi Ujian Terkunci Otomatis'
            : 'Peringatan Pelanggaran Fokus Ujian'}
        </h2>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          {isLockedByProctor
            ? `Anda telah mencapai batas pelanggaran (${violationCount}/${maxViolations}). Hubungi Pengawas Ruang untuk membuka kunci sesi Anda dari Dashboard Pengawas.`
            : reasonText ||
              `Sistem mendeteksi Anda meninggalkan jendela ujian atau keluar dari layar penuh (${violationCount}/${maxViolations}).`}
        </p>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
          Status Pelanggaran: {violationCount} / {maxViolations}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {isLockedByProctor ? (
            <button
              type="button"
              onClick={onRefreshStatus}
              className="w-full rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg hover:opacity-90"
            >
              Periksa Status Pembukaan Kunci Pengawas
            </button>
          ) : (
            <button
              type="button"
              onClick={onResumeExam}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg hover:opacity-90"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Kembali ke Layar Penuh & Lanjutkan Ujian</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

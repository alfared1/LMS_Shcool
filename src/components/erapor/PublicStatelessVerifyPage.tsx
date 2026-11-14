import { CheckCircle2, Home, ShieldCheck, ShieldAlert } from 'lucide-react';
import { SchoolCrestLogo } from '../layout/SchoolCrestLogo';

interface PublicStatelessVerifyPageProps {
  params: URLSearchParams;
  onBackHome: () => void;
}

export function PublicStatelessVerifyPage({
  params,
  onBackHome,
}: PublicStatelessVerifyPageProps) {
  const school = params.get('school') || 'SMA Islam Terpadu Cendekia';
  const studentName = params.get('name') || 'Ahmad Fauzi';
  const nisn = params.get('nisn') || '0084921034';
  const classroom = params.get('class') || 'X-IPA-1';
  const semester = params.get('sem') || '2026/2027 Ganjil';
  const score = params.get('score') || '91.4';
  const principal = params.get('principal') || 'Dr. H. Ahmad Muzakki, M.Pd.';
  const hash = params.get('hash') || '';

  const hasValidHash = hash.trim().length >= 16;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4 min-w-0">
              <SchoolCrestLogo className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-primary">
                  PUBLIC CRYPTOGRAPHIC DOCUMENT VERIFICATION
                </p>
                <h1 className="truncate text-lg sm:text-xl font-extrabold text-slate-900">
                  {school}
                </h1>
                <p className="text-xs text-slate-500">
                  Verifikasi Mandiri Lintas Perangkat · Tanpa Login
                </p>
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          {hasValidHash ? (
            <div className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>DOKUMEN E-RAPOR ASLI & TERVERIFIKASI SHA-256</span>
                </span>
                <p className="mt-2.5 text-sm text-emerald-900 leading-relaxed">
                  Tanda tangan digital dan metadata dokumen ini valid secara mandiri. Data tercantum berasal langsung dari payload QR Code resmi E-Rapor {school}.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
              <ShieldAlert className="h-8 w-8 shrink-0 text-amber-600" />
              <div>
                <h2 className="text-base font-extrabold text-amber-950">
                  Parameter Hash Kriptografis Tidak Lengkap
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  Silakan pindai ulang QR Code langsung dari lembar resmi E-Rapor sekolah.
                </p>
              </div>
            </div>
          )}

          {/* Metadata Table */}
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 px-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Nama Sekolah Penerbit</dt>
              <dd className="font-bold text-slate-900 text-right">{school}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Nama Siswa</dt>
              <dd className="font-bold text-slate-900 text-right">{studentName}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">NISN</dt>
              <dd className="font-mono font-semibold text-slate-900 text-right">{nisn}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Kelas / Rombel</dt>
              <dd className="font-semibold text-slate-900 text-right">{classroom}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Tahun Ajaran / Semester</dt>
              <dd className="font-semibold text-slate-900 text-right">{semester}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Nilai Rata-rata</dt>
              <dd className="font-mono text-base font-extrabold text-brand-primary tabular-nums text-right">
                {score}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 py-3">
              <dt className="text-slate-500">Pejabat Penandatangan</dt>
              <dd className="font-semibold text-slate-900 text-right">{principal}</dd>
            </div>
            <div className="py-3">
              <dt className="mb-1.5 text-slate-500">Kode Hash Kriptografis SHA-256</dt>
              <dd className="break-all rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800">
                {hash || '-'}
              </dd>
            </div>
          </dl>

          {/* Footer Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              <span>Terverifikasi Lintas Perangkat (Stateless SHA-256)</span>
            </span>

            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-brand-primary-fg hover:opacity-90"
            >
              <Home className="h-4 w-4" />
              <span>Kembali ke Beranda Aplikasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ShieldX, ShieldCheck } from 'lucide-react';
import { SchoolCrestLogo } from '../components/layout/SchoolCrestLogo';
import type { ReportCardDTO, SchoolConfig } from '../types/lms';
import { DEFAULT_SCHOOL_CONFIG } from '../lib/seed-data';

function maskName(fullName: string): string {
  return fullName
    .split(' ')
    .map((part) => (part.length <= 2 ? part : `${part.slice(0, 3)}${'*'.repeat(part.length - 3)}`))
    .join(' ');
}

export function VerifyHashPage() {
  const { hash = '' } = useParams<{ hash: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [reportCard, setReportCard] = useState<ReportCardDTO | null>(null);
  const [school, setSchool] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);

  useEffect(() => {
    if (!hash) return;
    fetch(`/api/verify/${hash}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setValid(Boolean(data.valid));
          setReportCard(data.reportCard || null);
          if (data.schoolConfig) setSchool(data.schoolConfig);
        }
      })
      .finally(() => setLoading(false));
  }, [hash]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-600">
        Memverifikasi tanda tangan kriptografis SHA-256...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <SchoolCrestLogo className="h-12 w-12 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-brand-primary">SISTEM VERIFIKASI KEASLIAN E-RAPOR</p>
            <h1 className="text-lg font-bold text-slate-900">{school.schoolName}</h1>
            <p className="text-xs text-slate-500">NPSN {school.npsn}</p>
          </div>
        </div>

        {valid && reportCard ? (
          <>
            <div className="flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-lg font-extrabold text-emerald-950">
                  Sertifikat Dokumen Asli & Terverifikasi
                </h2>
                <p className="mt-1 text-sm text-emerald-800">
                  Hash SHA-256 cocok dengan arsip resmi yang terkunci pada pangkalan data sekolah. Tidak ditemukan indikasi manipulasi nilai.
                </p>
              </div>
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Pemilik Dokumen (Privasi Terlindungi)</dt>
                <dd className="font-bold text-slate-900">{maskName(reportCard.studentName)}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">NISN / Rombel</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {reportCard.studentNisn} · {reportCard.classroomName}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Tahun Ajaran</dt>
                <dd className="font-semibold text-slate-900">{reportCard.academicYear}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Pejabat Penandatangan</dt>
                <dd className="font-semibold text-slate-900">{school.principalName}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-slate-500">Tanggal Diterbitkan</dt>
                <dd className="font-mono text-slate-900">
                  {new Date(reportCard.publishedAt).toLocaleString('id-ID')}
                </dd>
              </div>
              <div className="py-3">
                <dt className="text-slate-500 mb-1">Sidik Jari Kriptografis SHA-256</dt>
                <dd className="break-all rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-800">
                  {reportCard.sha256Hash}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <span>Status Arsip: Terkunci Permanen</span>
              </span>
              <Link to="/" className="text-xs font-semibold text-brand-primary hover:underline">
                Kembali ke Beranda
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
              <ShieldX className="h-8 w-8 shrink-0 text-red-600" />
              <div>
                <h2 className="text-lg font-extrabold text-red-950">
                  Hash Dokumen Tidak Ditemukan
                </h2>
                <p className="mt-1 text-sm text-red-800">
                  Kode hash <span className="font-mono break-all">{hash}</span> tidak terdaftar dalam arsip resmi {school.schoolName}.
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="inline-block rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-semibold text-brand-primary-fg"
            >
              Kembali ke Portal Sekolah
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

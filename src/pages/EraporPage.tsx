import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ExternalLink, Lock, Printer, ShieldCheck } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { SchoolCrestLogo } from '../components/layout/SchoolCrestLogo';
import { SEED_REPORT_CARD } from '../lib/seed-data';
import type { ReportCardDTO } from '../types/lms';

export function EraporPage() {
  const { config } = useTenantAndDemo();
  const [rapor, setRapor] = useState<ReportCardDTO>(SEED_REPORT_CARD);
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    fetch('/api/erapor')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.grades) setRapor(d);
      })
      .catch(() => undefined);
  }, []);

  const averageScore =
    Math.round(
      (rapor.grades.reduce((sum, g) => sum + g.finalGrade, 0) / Math.max(rapor.grades.length, 1)) * 10
    ) / 10;

  const verifyQuery = `?verify=true&school=${encodeURIComponent(config.schoolName)}&name=${encodeURIComponent(rapor.studentName)}&nisn=${encodeURIComponent(rapor.studentNisn)}&class=${encodeURIComponent(rapor.classroomName)}&sem=${encodeURIComponent(rapor.academicYear || '2026/2027 Ganjil')}&score=${encodeURIComponent(String(averageScore))}&principal=${encodeURIComponent(config.principalName)}&hash=${encodeURIComponent(rapor.sha256Hash)}`;

  const verifyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${verifyQuery}`
      : `/${verifyQuery}`;

  useEffect(() => {
    QRCode.toString(verifyUrl, {
      type: 'svg',
      margin: 1,
      width: 120,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((svg) => setQrSvg(svg))
      .catch(() => undefined);
  }, [verifyUrl]);

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 print:p-0 print:m-0 print:space-y-0">
      {/* Action Header (Hidden when printing) */}
      <div className="no-print print:hidden flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">ARSIP DOKUMEN RESMI · PRIVATE VAULT</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            E-Rapor Digital & Verifikasi SHA-256
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Dokumen terkunci kriptografis. Pindai QR Code dengan kamera ponsel untuk membuka halaman verifikasi publik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/${verifyQuery}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4 text-brand-primary" />
            <span>Buka Halaman Verifikasi</span>
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-brand-primary-fg hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Simpan PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Printable A4 Sheet */}
      <article className="print-sheet mx-auto max-w-[820px] rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm space-y-6 print:w-full print:max-w-none print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Dynamic School Kop Surat */}
        <header className="flex items-center gap-5 border-b-2 border-slate-900 pb-5">
          <SchoolCrestLogo className="h-16 w-16 shrink-0" />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold tracking-wider text-brand-primary uppercase">
              Laporan Hasil Belajar Peserta Didik (E-Rapor)
            </p>
            <h2 className="mt-0.5 text-xl sm:text-2xl font-extrabold text-slate-900">
              {config.schoolName}
            </h2>
            <p className="text-xs text-slate-600">
              NPSN: <span className="font-mono font-semibold">{config.npsn}</span> · {config.address}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <Lock className="h-3.5 w-3.5" />
              <span>TERKUNCI</span>
            </span>
            <span className="mt-1 font-mono text-[11px] text-slate-500">
              {config.curriculumType.replace(/_/g, ' ')}
            </span>
          </div>
        </header>

        {/* Student Identity */}
        <section className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nama Siswa</span>
            <span className="font-bold text-slate-900">{rapor.studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kelas / Rombel</span>
            <span className="font-bold text-slate-900">{rapor.classroomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">NISN</span>
            <span className="font-mono font-semibold text-slate-900">{rapor.studentNisn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tahun Ajaran</span>
            <span className="font-semibold text-slate-900">{rapor.academicYear}</span>
          </div>
        </section>

        {/* Grades Table */}
        <section>
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 text-slate-700">
                <th className="py-2.5 px-2">Mata Pelajaran</th>
                <th className="py-2.5 px-2 text-right">KKM</th>
                <th className="py-2.5 px-2 text-right">Game (20%)</th>
                <th className="py-2.5 px-2 text-right">Tugas (20%)</th>
                <th className="py-2.5 px-2 text-right">UTS (25%)</th>
                <th className="py-2.5 px-2 text-right">UAS (35%)</th>
                <th className="py-2.5 px-2 text-right">Nilai Akhir</th>
                <th className="py-2.5 px-2 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rapor.grades.map((g) => (
                <tr key={g.code}>
                  <td className="py-2.5 px-2">
                    <p className="font-semibold text-slate-900">{g.name}</p>
                    <p className="text-[11px] text-slate-500">{g.teacherNote}</p>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-500">{g.kkm}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">{g.dailyGameAvg}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">{g.taskScore}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">{g.utsScore}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">{g.uasScore}</td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-slate-900">
                    {g.finalGrade}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-brand-primary">
                    {g.predicate}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
                <td colSpan={6} className="py-2.5 px-2 text-right">
                  Rata-Rata Keseluruhan
                </td>
                <td className="py-2.5 px-2 text-right font-mono tabular-nums">{averageScore}</td>
                <td className="py-2.5 px-2 text-center font-mono text-brand-primary">TUNTAS</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Attendance & Homeroom Note */}
        <section className="grid gap-4 sm:grid-cols-12 text-xs">
          <div className="sm:col-span-4 rounded-xl border border-slate-200 p-3.5 space-y-1.5">
            <p className="font-bold text-slate-800">Ketidakhadiran</p>
            <div className="flex justify-between text-slate-600">
              <span>Sakit</span>
              <span className="font-mono font-semibold">{rapor.attendance.sick} hari</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Izin</span>
              <span className="font-mono font-semibold">{rapor.attendance.permit} hari</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tanpa Keterangan</span>
              <span className="font-mono font-semibold">{rapor.attendance.alpha} hari</span>
            </div>
          </div>

          <div className="sm:col-span-8 rounded-xl border border-slate-200 p-3.5">
            <p className="font-bold text-slate-800">Catatan Wali Kelas</p>
            <p className="mt-1.5 leading-relaxed text-slate-600">{rapor.homeroomNote}</p>
          </div>
        </section>

        {/* Signature & Live Scannable QR Verification */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-200 pt-6">
          <div className="flex items-center gap-4">
            <div
              className="h-28 w-28 shrink-0 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center"
              aria-label="QR Code Verifikasi Keaslian E-Rapor"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="max-w-xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <span>Tanda Tangan Kriptografis SHA-256</span>
              </div>
              <p className="break-all font-mono text-[10px] text-slate-500">
                {rapor.sha256Hash}
              </p>
              <p className="text-[11px] text-slate-500">
                Pindai QR untuk memverifikasi keaslian dokumen resmi secara daring.
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right text-xs text-slate-700">
            <p>Diterbitkan: {new Date(rapor.publishedAt).toLocaleDateString('id-ID')}</p>
            <p className="mt-0.5 font-semibold">Kepala {config.schoolName}</p>
            <div className="my-4 font-display text-sm italic text-brand-primary">
              [Tertandatangani Digital]
            </div>
            <p className="font-bold text-slate-900 underline underline-offset-4">
              {config.principalName}
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">NIP. {config.principalNip}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CalendarCheck,
  Download,
  FileBadge2,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { SEED_REPORT_CARD } from '../lib/seed-data';
import type { ExamAttemptDTO, ReportCardDTO } from '../types/lms';
import { mergeAttemptWithLiveSync } from '../lib/cbt-sync';

const SEMESTER_PROGRESSION = [
  { label: 'Sem 1 (SMP IX)', avg: 84.5 },
  { label: 'Sem 2 (SMP IX)', avg: 86.2 },
  { label: 'Mid Sem (X-1)', avg: 88.1 },
  { label: 'Saat Ini (X-1)', avg: 90.4 },
];

export function ParentDashboardPage() {
  const { config, roleProfile } = useTenantAndDemo();
  const [rapor, setRapor] = useState<ReportCardDTO>(SEED_REPORT_CARD);
  const [studentAttempts, setStudentAttempts] = useState<ExamAttemptDTO[]>([]);

  useEffect(() => {
    fetch('/api/erapor')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.grades)) setRapor(d);
      })
      .catch(() => undefined);

    fetch('/api/proctor/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.attempts)) {
          const merged = (d.attempts as ExamAttemptDTO[])
            .map(mergeAttemptWithLiveSync)
            .filter((a) => a.studentNisn === SEED_REPORT_CARD.studentNisn || a.studentName === 'Ahmad Fauzi');
          setStudentAttempts(merged);
        }
      })
      .catch(() => undefined);
  }, []);

  const overallAvg = (
    rapor.grades.reduce((sum, g) => sum + g.finalGrade, 0) / Math.max(rapor.grades.length, 1)
  ).toFixed(2);

  const totalViolations = studentAttempts.reduce((sum, a) => sum + (a.violationCount || 0), 0);
  const hasLockedExam = studentAttempts.some((a) => a.isLockedByProctor);

  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?verify=true&school=${encodeURIComponent(config.schoolName)}&name=${encodeURIComponent(rapor.studentName)}&nisn=${encodeURIComponent(rapor.studentNisn)}&class=${encodeURIComponent(rapor.classroomName)}&sem=${encodeURIComponent('2026/2027 Ganjil')}&score=${encodeURIComponent(overallAvg)}&principal=${encodeURIComponent(config.principalName)}&hash=${encodeURIComponent(rapor.sha256Hash)}`;

  // SVG trend coordinates
  const chartW = 460;
  const chartH = 150;
  const points = SEMESTER_PROGRESSION.map((pt, idx) => {
    const x = 44 + (idx * (chartW - 88)) / (SEMESTER_PROGRESSION.length - 1);
    const y = chartH - 28 - ((pt.avg - 75) / 25) * (chartH - 56);
    return { ...pt, x, y };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">
            PORTAL WALI MURID · {config.schoolName}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Pemantauan Akademik: {rapor.studentName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Wali Murid: {roleProfile.personName} · Kelas {rapor.classroomName} · NISN {rapor.studentNisn}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/erapor"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-brand-primary-fg hover:opacity-90 whitespace-nowrap"
          >
            <FileBadge2 className="h-4 w-4" />
            <span>Lihat & Cetak E-Rapor</span>
          </Link>
          <a
            href={verifyUrl}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 hover:border-brand-primary whitespace-nowrap"
          >
            <QrCode className="h-4 w-4 text-brand-primary" />
            <span>Verifikasi Keaslian QR</span>
          </a>
        </div>
      </section>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Rata-Rata Nilai Rapor</span>
            <Award className="h-4 w-4 text-brand-primary" />
          </div>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-slate-900">
            {overallAvg}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Lulus KKM di seluruh 7 mapel</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Kehadiran Semester Ini</span>
            <CalendarCheck className="h-4 w-4 text-brand-secondary" />
          </div>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-slate-900">
            98.8%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Sakit: {rapor.attendance.sick} · Izin: {rapor.attendance.permit} · Alpa: {rapor.attendance.alpha}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Integritas Ujian CBT</span>
            {hasLockedExam ? (
              <ShieldAlert className="h-4 w-4 text-red-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-slate-900">
            {totalViolations}x
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {hasLockedExam
              ? 'Perhatian: Sesi ujian anak sedang terkunci pengawas'
              : 'Pelanggaran pindah tab / keluar fokus'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Status Dokumen E-Rapor</span>
            <FileBadge2 className="h-4 w-4 text-brand-primary" />
          </div>
          <p className="mt-2 text-lg font-extrabold text-emerald-700">Terverifikasi SHA-256</p>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
            {rapor.sha256Hash.slice(0, 20)}...
          </p>
        </div>
      </div>

      {/* Main Content: Progression Chart + Per-Subject Breakdown */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Grade Progression Chart */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-primary" />
                <span>Grafik Perkembangan Nilai Anak</span>
              </h2>
              <p className="text-xs text-slate-500">
                Tren rata-rata akademik lintas semester menuju {rapor.academicYear}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44" aria-label="Grafik Perkembangan Nilai">
              {[80, 85, 90, 95].map((val) => {
                const y = chartH - 28 - ((val - 75) / 25) * (chartH - 56);
                return (
                  <g key={val}>
                    <line x1={30} y1={y} x2={chartW - 20} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <text x={8} y={y + 3} fontSize="10" fill="#64748b">
                      {val}
                    </text>
                  </g>
                );
              })}
              <polyline
                fill="none"
                stroke="hsl(var(--brand-primary))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {points.map((pt) => (
                <g key={pt.label}>
                  <circle cx={pt.x} cy={pt.y} r={5} fill="hsl(var(--brand-primary))" stroke="#ffffff" strokeWidth="2" />
                  <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                    {pt.avg}
                  </text>
                  <text x={pt.x} y={chartH - 8} textAnchor="middle" fontSize="10" fill="#475569">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Attendance & Exam Violation History */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Ujian CBT & Kedisiplinan</h3>
            {studentAttempts.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
                Tidak ada catatan pelanggaran ujian CBT aktif. Ananda mengikuti evaluasi dengan tertib.
              </div>
            ) : (
              <div className="space-y-2">
                {studentAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{att.examTitle}</span>
                      <span
                        className={`font-semibold ${
                          att.isLockedByProctor
                            ? 'text-red-700'
                            : att.submittedAt
                            ? 'text-emerald-700'
                            : 'text-sky-700'
                        }`}
                      >
                        {att.isLockedByProctor
                          ? 'Terkunci Pengawas'
                          : att.submittedAt
                          ? `Selesai (Nilai: ${att.finalScore ?? '-'})`
                          : 'Sedang Berlangsung'}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      Pelanggaran tercatat: <strong className="font-mono">{att.violationCount}/{att.maxTabSwitches}</strong>
                      {att.violationLogs.length > 0 && ` · Terakhir: ${att.violationLogs[att.violationLogs.length - 1].detail}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right: Subject Grades & E-Rapor Download Card */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Rekap Nilai Per Mata Pelajaran</h2>
              <p className="text-xs text-slate-500">Data langsung dari Buku Nilai Guru & E-Rapor</p>
            </div>
            <Link
              to="/erapor"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary"
            >
              <Download className="h-3.5 w-3.5 text-brand-primary" />
              <span>Unduh PDF</span>
            </Link>
          </div>

          <div className="space-y-3">
            {rapor.grades.map((g) => (
              <div key={g.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{g.name}</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {g.finalGrade} ({g.predicate})
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-primary transition-all"
                    style={{ width: `${Math.min(100, g.finalGrade)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">{g.teacherNote}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <p className="font-bold text-slate-900">Catatan Wali Kelas</p>
            <p className="mt-1 leading-relaxed">{rapor.homeroomNote}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

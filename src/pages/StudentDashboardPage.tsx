import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Flame, Gamepad2, ShieldCheck, BookOpen, FileBadge2 } from 'lucide-react';
import { SEED_GAMES, SEED_MATERIALS, SEED_REPORT_CARD } from '../lib/seed-data';
import type { EducationalGame, ReportCardDTO } from '../types/lms';

const CLASS_LEADERBOARD = [
  { rank: 1, name: 'Ahmad Fauzi', className: 'X-IPA-1', xp: 2480 },
  { rank: 2, name: 'Dewi Lestari', className: 'X-IPA-1', xp: 2390 },
  { rank: 3, name: 'Rizky Ramadhan', className: 'X-IPA-1', xp: 2150 },
  { rank: 4, name: 'Siti Nurhaliza', className: 'X-IPA-1', xp: 2040 },
  { rank: 5, name: 'Nadia Putri', className: 'X-IPA-1', xp: 1920 },
];

export function StudentDashboardPage() {
  const [games, setGames] = useState<EducationalGame[]>(SEED_GAMES);
  const [rapor, setRapor] = useState<ReportCardDTO>(SEED_REPORT_CARD);

  useEffect(() => {
    fetch('/api/games')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => Array.isArray(d) && d.length && setGames(d))
      .catch(() => undefined);
    fetch('/api/erapor')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && d.grades && setRapor(d))
      .catch(() => undefined);
  }, []);

  // Build SVG Radar Chart polygon points for top 5 subjects
  const radarSubjects = rapor.grades.slice(0, 5);
  const cx = 110;
  const cy = 110;
  const maxR = 76;
  const polygonPoints = radarSubjects
    .map((subj, idx) => {
      const angle = (Math.PI * 2 * idx) / radarSubjects.length - Math.PI / 2;
      const ratio = Math.min(1, subj.finalGrade / 100);
      const x = cx + Math.cos(angle) * maxR * ratio;
      const y = cy + Math.sin(angle) * maxR * ratio;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      {/* Row 1: 12-Col High-Priority Active CBT Banner + Student Profile */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold text-brand-primary">JADWAL UJIAN HARI INI</p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900">
              UAS Ganjil: Informatika & Literasi Digital
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Durasi 60 menit · Token Aktif dibagikan oleh Pengawas Ruang CBT.
            </p>
          </div>
          <Link
            to="/cbt"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Buka Lobi CBT</span>
          </Link>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Ahmad Fauzi · X-IPA-1</p>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Flame className="h-5 w-5 text-amber-500" />
                <span className="font-mono text-lg font-bold tabular-nums text-slate-900">14 Hari</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="h-5 w-5 text-brand-primary" />
                <span className="font-mono text-lg font-bold tabular-nums text-slate-900">2.480 XP</span>
              </div>
            </div>
          </div>
          <Link
            to="/erapor"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-brand-primary"
          >
            <FileBadge2 className="h-4 w-4 text-brand-primary" />
            <span>E-Rapor</span>
          </Link>
        </div>
      </div>

      {/* Row 2: 8 Cols Active Missions & Materials + 4 Cols Leaderboard & Radar Chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          {/* Active LKPD & Game Missions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Misi LKPD & Game Wajib</h2>
              <Link to="/games" className="text-xs font-semibold text-brand-primary hover:underline">
                Lihat Semua
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {games.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Gamepad2 className="h-5 w-5 shrink-0 text-brand-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{g.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {g.subjectName} · Kelas {g.gradeLevel}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/games/${g.slug}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary whitespace-nowrap shrink-0"
                  >
                    Kerjakan
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Materials */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Modul Pembelajaran Terkini</h2>
              <Link to="/materials" className="text-xs font-semibold text-brand-primary hover:underline">
                Buka Perpustakaan
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {SEED_MATERIALS.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="h-5 w-5 shrink-0 text-brand-secondary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {m.subjectName} · Estimasi {m.readMinutes} menit
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/materials"
                    className="text-xs font-semibold text-brand-primary hover:underline whitespace-nowrap shrink-0"
                  >
                    Baca
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right 4 Cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Radar Chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Peta Kompetensi Mapel</h2>
            <p className="text-xs text-slate-500">Agregasi Game, Tugas, UTS & UAS</p>
            <div className="mt-4 flex justify-center">
              <svg viewBox="0 0 220 220" className="h-52 w-52" aria-label="Grafik Radar Kompetensi Siswa">
                {[0.33, 0.66, 1].map((r) => (
                  <circle
                    key={r}
                    cx={cx}
                    cy={cy}
                    r={maxR * r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                ))}
                {radarSubjects.map((subj, idx) => {
                  const angle = (Math.PI * 2 * idx) / radarSubjects.length - Math.PI / 2;
                  const lx = cx + Math.cos(angle) * (maxR + 18);
                  const ly = cy + Math.sin(angle) * (maxR + 18);
                  return (
                    <g key={subj.code}>
                      <line
                        x1={cx}
                        y1={cy}
                        x2={cx + Math.cos(angle) * maxR}
                        y2={cy + Math.sin(angle) * maxR}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#334155"
                      >
                        {subj.code}
                      </text>
                    </g>
                  );
                })}
                <polygon
                  points={polygonPoints}
                  fill="hsl(var(--brand-primary) / 0.24)"
                  stroke="hsl(var(--brand-primary))"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </section>

          {/* Class Leaderboard */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Peringkat Kelas X-IPA-1</h2>
            <div className="mt-4 space-y-2.5">
              {CLASS_LEADERBOARD.map((row) => (
                <div
                  key={row.rank}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-500">#{row.rank}</span>
                    <span className="font-semibold text-slate-800">{row.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-brand-primary">
                    {row.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

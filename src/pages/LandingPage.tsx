import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Play, ShieldCheck, FlaskConical, FileBadge2, BookOpen } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { SEED_GAMES, SEED_MATERIALS } from '../lib/seed-data';
import type { EducationalGame } from '../types/lms';

const ENGINE_LABELS: Record<EducationalGame['engineType'], string> = {
  MILLIONAIRE_QUIZ: 'Millionaire Quiz',
  IFP_TOWER_BATTLE: 'Layar IFP Kelas (Split-Screen)',
  SWIPE_CARD: 'Swipe Klasifikasi Cepat',
  ROLEPLAY_LKPD: 'Simulasi LKPD Interaktif',
  TURN_BASED_ARENA: 'Arena Kuis Kelompok',
};

export function LandingPage() {
  const { config, language } = useTenantAndDemo();
  const [games, setGames] = useState<EducationalGame[]>(SEED_GAMES);
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'SMP' | 'SMA'>('ALL');
  const [miniSelected, setMiniSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/games')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setGames(data);
      })
      .catch(() => undefined);
  }, []);

  const filteredGames = games.filter((g) => levelFilter === 'ALL' || g.level === levelFilter);
  const totalPlays = games.reduce((sum, g) => sum + g.playCount, 0);

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 space-y-16">
      {/* Hero Section: 2-Column Balanced Split */}
      <section className="grid gap-10 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between py-2">
          <div>
            <p className="text-xs font-semibold text-brand-primary">
              Kurikulum Terpadu · NPSN {config.npsn}
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance]">
              {config.schoolName}
            </h1>
            <p className="mt-4 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
              {config.tagline}. Menggabungkan gamifikasi LKPD di layar kelas IFP, ujian CBT berintegritas tinggi, laboratorium virtual, dan arsip E-Rapor terverifikasi SHA-256.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                to="/games"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-brand-primary-fg shadow-xs hover:opacity-90 whitespace-nowrap"
              >
                <Play className="h-4 w-4" />
                <span>{language === 'en' ? 'Explore Game Catalog' : 'Jelajahi Katalog Game'}</span>
              </Link>
              <Link
                to="/verify/8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <FileBadge2 className="h-4 w-4 text-brand-primary" />
                <span>{language === 'en' ? 'Verify E-Rapor' : 'Cek Keaslian Rapor'}</span>
              </Link>
            </div>
          </div>

          {/* Quantitative Strip Adjacent to Hero */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-200 pt-6">
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-slate-900">
                {games.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Engine Game & LKPD Aktif</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-slate-900">
                {totalPlays.toLocaleString('id-ID')}
              </p>
              <p className="mt-1 text-xs text-slate-500">Sesi Bermain Siswa</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-slate-900">
                {SEED_MATERIALS.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Modul Ajar & Lab Digital</p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Mini-Quiz Preview */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
              <span className="font-semibold text-brand-primary">Pratinjau Kuis Interaktif</span>
              <span>PAI · Kelas 10 SMA</span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900 leading-snug">
              Berapakah batas minimal kepemilikan (nisab) emas murni yang mewajibkan Zakat Mal sebesar 2,5%?
            </h2>

            <div className="mt-5 space-y-2.5">
              {[
                { id: 'A', label: '50 gram emas murni' },
                { id: 'B', label: '85 gram emas murni' },
                { id: 'C', label: '100 gram emas murni' },
              ].map((opt) => {
                const chosen = miniSelected === opt.id;
                const isCorrect = opt.id === 'B';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMiniSelected(opt.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                      chosen
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-rose-400 bg-rose-50 text-rose-900'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>
                      <strong className="mr-2 font-mono">{opt.id}.</strong>
                      {opt.label}
                    </span>
                    {chosen && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            {miniSelected && (
              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                {miniSelected === 'B'
                  ? 'Tepat! Nisab emas adalah 85 gram (setara 20 dinar) dan telah melewati 1 tahun kepemilikan (haul).'
                  : 'Belum tepat. Dalam ketentuan fiqih zakat, nisab emas ditetapkan sebesar 85 gram emas murni.'}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">Coba versi lengkap dengan 5 Lifelines</span>
            <Link
              to="/games/who-wants-to-be-a-muzakki"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
            >
              <span>Mainkan Sekarang</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Catalog Preview with Segmented Filter */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Katalog Game & LKPD Interaktif</h2>
            <p className="mt-1 text-sm text-slate-600">
              Dikembangkan langsung oleh guru mata pelajaran untuk pembelajaran individu dan layar kelas IFP.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['ALL', 'SMP', 'SMA'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  levelFilter === lvl
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl === 'ALL' ? 'Semua Jenjang' : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <Link
              key={game.id}
              to={`/games/${game.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-brand-primary hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-brand-primary">
                    {ENGINE_LABELS[game.engineType]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {game.level} Kelas {game.gradeLevel}
                  </span>
                </div>
                <h3 className="mt-2.5 text-lg font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                  {game.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{game.subjectName}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>Oleh {game.creatorName}</span>
                <span className="font-mono font-semibold tabular-nums text-slate-700">
                  {game.playCount.toLocaleString('id-ID')}x dimainkan
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Core Modules Grid */}
      <section className="grid gap-5 md:grid-cols-3">
        <Link
          to="/cbt"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-primary"
        >
          <ShieldCheck className="h-6 w-6 text-brand-primary" />
          <h3 className="mt-3 text-base font-bold text-slate-900">Ujian CBT Mode Zen</h3>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Pengacakan soal deterministik, timer otoritatif server, deteksi pindah tab otomatis, dan pemantauan Pengawas Ruang.
          </p>
        </Link>

        <Link
          to="/virtual-lab"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-primary"
        >
          <FlaskConical className="h-6 w-6 text-brand-secondary" />
          <h3 className="mt-3 text-base font-bold text-slate-900">Virtual Lab & Sandbox Python</h3>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Eksekusi kode Python di peramban serta simulator interaktif pH Asam-Basa dan Hukum Ohm untuk praktikum sains.
          </p>
        </Link>

        <Link
          to="/materials"
          className="rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-brand-primary"
        >
          <BookOpen className="h-6 w-6 text-brand-accent" />
          <h3 className="mt-3 text-base font-bold text-slate-900">Perpustakaan & E-Rapor QR</h3>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            Katalog modul ajar terstruktur per jenjang serta rapor digital resmi dengan verifikasi kriptografis SHA-256.
          </p>
        </Link>
      </section>
    </div>
  );
}

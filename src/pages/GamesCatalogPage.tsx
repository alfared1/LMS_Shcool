import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Search, Sparkles } from 'lucide-react';
import { SEED_GAMES } from '../lib/seed-data';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import type { EducationalGame } from '../types/lms';

const ENGINE_LABELS: Record<EducationalGame['engineType'], string> = {
  MILLIONAIRE_QUIZ: 'Millionaire Quiz',
  IFP_TOWER_BATTLE: 'IFP Split-Screen Tower',
  SWIPE_CARD: 'Swipe Klasifikasi',
  ROLEPLAY_LKPD: 'Simulasi LKPD',
  TURN_BASED_ARENA: 'Turn-Based Arena',
};

export function GamesCatalogPage() {
  const { aiGames } = useTenantAndDemo();
  const [serverGames, setServerGames] = useState<EducationalGame[]>(SEED_GAMES);
  const [level, setLevel] = useState<'ALL' | 'SMP' | 'SMA'>('ALL');
  const [grade, setGrade] = useState<number | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/games')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setServerGames(data);
      })
      .catch(() => undefined);
  }, []);

  const games = useMemo(() => {
    const map = new Map<string, EducationalGame>();
    for (const g of aiGames) {
      map.set(g.slug, g);
    }
    for (const g of serverGames) {
      if (!map.has(g.slug)) {
        map.set(g.slug, g);
      }
    }
    return Array.from(map.values());
  }, [aiGames, serverGames]);

  const filtered = games.filter((g) => {
    if (level !== 'ALL' && g.level !== level) return false;
    if (grade !== 'ALL' && g.gradeLevel !== grade) return false;
    if (
      query.trim() &&
      !`${g.title} ${g.subjectName} ${g.creatorName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Katalog Game & LKPD Interaktif</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Pilih permainan edukasi sesuai jenjang, kelas, atau mata pelajaran. Mendukung layar sentuh IFP kelas & game rakitan AI Studio.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul game atau mapel..."
            aria-label="Cari judul game atau mata pelajaran"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {(['ALL', 'SMP', 'SMA'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setLevel(lvl);
                setGrade('ALL');
              }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                level === lvl ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Jenjang' : lvl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setGrade('ALL')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              grade === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Semua Kelas
          </button>
          {[7, 8, 9, 10, 11, 12]
            .filter((g) => level === 'ALL' || (level === 'SMP' ? g <= 9 : g >= 10))
            .map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  grade === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Kelas {g}
              </button>
            ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-800">Tidak ada game yang cocok dengan filter.</p>
          <button
            type="button"
            onClick={() => {
              setLevel('ALL');
              setGrade('ALL');
              setQuery('');
            }}
            className="mt-3 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-primary-fg"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((game) => (
            <div
              key={game.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-primary">
                      {ENGINE_LABELS[game.engineType]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {game.level} Kelas {game.gradeLevel}
                    </span>
                  </div>
                  {game.isAiGenerated && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                      <Sparkles className="h-3 w-3" />
                      <span>Dibuat dengan AI Studio</span>
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 text-lg font-bold text-slate-900">{game.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {game.subjectName} · Oleh {game.creatorName}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="font-mono text-xs font-semibold tabular-nums text-slate-500">
                  {game.playCount.toLocaleString('id-ID')}x dimainkan
                </span>
                <Link
                  to={`/games/${game.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-brand-primary-fg hover:opacity-90"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Mainkan</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

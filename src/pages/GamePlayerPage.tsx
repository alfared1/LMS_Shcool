import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SEED_GAMES } from '../lib/seed-data';
import type { EducationalGame } from '../types/lms';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { MillionaireQuizEngine } from '../components/games/MillionaireQuizEngine';
import { IfpTowerBattleEngine } from '../components/games/IfpTowerBattleEngine';
import { SwipeCardEngine } from '../components/games/SwipeCardEngine';
import { RoleplayLkpdEngine } from '../components/games/RoleplayLkpdEngine';
import { TurnBasedArenaEngine } from '../components/games/TurnBasedArenaEngine';

export function GamePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const autostart = searchParams.get('autostart') === '1';
  const { roleProfile, aiGames } = useTenantAndDemo();

  const [game, setGame] = useState<EducationalGame | null>(() => {
    return aiGames.find((g) => g.slug === slug) || SEED_GAMES.find((g) => g.slug === slug) || null;
  });
  const [loading, setLoading] = useState(!game);

  useEffect(() => {
    if (!slug) return;
    const localFound = aiGames.find((g) => g.slug === slug);
    if (localFound) {
      setGame(localFound);
      setLoading(false);
      if (localFound.id.startsWith('ai-game-')) {
        return;
      }
    }
    fetch(`/api/games/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.slug) setGame(data);
      })
      .finally(() => setLoading(false));
  }, [slug, aiGames]);

  const handleComplete = useCallback(
    (score: number, durationSeconds: number) => {
      if (!slug) return;
      fetch(`/api/games/${slug}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: roleProfile.personName,
          classroomName: 'X-IPA-1',
          score: Math.round(score),
          durationSeconds: Math.round(durationSeconds),
        }),
      }).catch(() => undefined);
    },
    [slug, roleProfile.personName]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Memuat arena permainan...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <h1 className="text-2xl font-bold">Game Tidak Ditemukan</h1>
        <Link to="/games" className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950">
          Kembali ke Katalog Game
        </Link>
      </div>
    );
  }

  const parsedConfig = JSON.parse(game.configJson);

  switch (game.engineType) {
    case 'MILLIONAIRE_QUIZ':
      return (
        <MillionaireQuizEngine
          title={game.title}
          subjectName={game.subjectName}
          config={parsedConfig}
          autostart={autostart}
          onComplete={handleComplete}
        />
      );
    case 'IFP_TOWER_BATTLE':
      return (
        <IfpTowerBattleEngine
          title={game.title}
          subjectName={game.subjectName}
          config={parsedConfig}
          autostart={autostart}
          onComplete={handleComplete}
        />
      );
    case 'SWIPE_CARD':
      return (
        <SwipeCardEngine
          title={game.title}
          subjectName={game.subjectName}
          config={parsedConfig}
          autostart={autostart}
          onComplete={handleComplete}
        />
      );
    case 'ROLEPLAY_LKPD':
      return (
        <RoleplayLkpdEngine
          title={game.title}
          subjectName={game.subjectName}
          config={parsedConfig}
          autostart={autostart}
          onComplete={handleComplete}
        />
      );
    case 'TURN_BASED_ARENA':
    default:
      return (
        <TurnBasedArenaEngine
          title={game.title}
          subjectName={game.subjectName}
          config={parsedConfig}
          autostart={autostart}
          onComplete={handleComplete}
        />
      );
  }
}

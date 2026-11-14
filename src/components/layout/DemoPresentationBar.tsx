import { SlidersHorizontal, X, Volume2, VolumeX, Globe, UserCheck } from 'lucide-react';
import { DEMO_ROLES, useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { WHITE_LABEL_PRESETS } from '../../lib/seed-data';
import type { DemoRole } from '../../types/lms';

export function DemoPresentationBar() {
  const {
    activeRole,
    setActiveRole,
    language,
    setLanguage,
    isMuted,
    toggleMute,
    isDemoBarOpen,
    setDemoBarOpen,
    applyPreset,
    config,
    isInCbtRoom,
    isInGameArena,
  } = useTenantAndDemo();

  if (isInCbtRoom || (isInGameArena && !isDemoBarOpen)) {
    return null;
  }

  const roles: Array<{ role: DemoRole; short: string }> = [
    { role: 'STUDENT', short: 'Siswa · Ahmad Fauzi' },
    { role: 'TEACHER', short: 'Guru · Ustadz Hendra' },
    { role: 'PROCTOR', short: 'Pengawas · Ibu Rina' },
    { role: 'SUPER_ADMIN', short: 'Super Admin · White-Label' },
  ];

  return (
    <div className="no-print fixed bottom-4 left-4 z-50">
      {!isDemoBarOpen ? (
        <button
          type="button"
          onClick={() => setDemoBarOpen(true)}
          aria-label="Buka Toolbar Presentasi Demo (Ctrl+D)"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-brand-primary" />
          <span className="sm:hidden whitespace-nowrap">Peran Demo</span>
          <span className="hidden sm:inline whitespace-nowrap">{DEMO_ROLES[activeRole].shortLabel}</span>
          <span className="hidden sm:inline text-slate-400">· Ctrl+D</span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-brand-primary" />
              <span className="text-sm font-bold text-slate-900">Mode Presentasi & Pengalih Peran</span>
            </div>
            <button
              type="button"
              onClick={() => setDemoBarOpen(false)}
              aria-label="Tutup Toolbar Presentasi"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500">Pilih Peran Aktif (1 Klik)</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {roles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setActiveRole(r.role, true)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                    activeRole === r.role
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {r.short}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500">
              Preset White-Label Instan ({config.schoolShortName})
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {WHITE_LABEL_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p.key)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  <span
                    className="mb-1 block h-1.5 w-full rounded-sm"
                    style={{ backgroundColor: p.config.primaryColorHex }}
                  />
                  <span className="block truncate">{p.config.schoolShortName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Bahasa: {language.toUpperCase()}</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isMuted ? 'Audio Mati' : 'Audio Aktif'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

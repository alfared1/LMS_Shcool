import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { DemoRole, LanguageCode, SchoolConfig } from '../types/lms';
import { DEFAULT_SCHOOL_CONFIG, WHITE_LABEL_PRESETS } from '../lib/seed-data';
import { hexToHslComponents } from '../lib/core-logic';

export interface RoleProfile {
  role: DemoRole;
  label: string;
  shortLabel: string;
  personName: string;
  subtitle: string;
  defaultRoute: string;
}

export const DEMO_ROLES: Record<DemoRole, RoleProfile> = {
  STUDENT: {
    role: 'STUDENT',
    label: 'Siswa (Ahmad Fauzi - X IPA 1)',
    shortLabel: 'Siswa · Ahmad Fauzi',
    personName: 'Ahmad Fauzi',
    subtitle: 'NISN 0084921034 · Kelas X-IPA-1',
    defaultRoute: '/dashboard/student',
  },
  TEACHER: {
    role: 'TEACHER',
    label: 'Guru Mapel & Kreator Game (Ustadz Hendra, M.Pd)',
    shortLabel: 'Guru · Ustadz Hendra',
    personName: 'Ustadz Hendra, M.Pd',
    subtitle: 'NIP 19840511 201001 1 008 · Informatika',
    defaultRoute: '/dashboard/teacher',
  },
  PROCTOR: {
    role: 'PROCTOR',
    label: 'Pengawas Ruang CBT (Ibu Rina - Proctor)',
    shortLabel: 'Pengawas · Ibu Rina',
    personName: 'Ibu Rina, S.Pd',
    subtitle: 'Pengawas Ruang 01 · UAS Ganjil',
    defaultRoute: '/dashboard/proctor',
  },
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Admin (Live White-Label Customizer)',
    shortLabel: 'Admin · White-Label',
    personName: 'Super Admin',
    subtitle: 'Konfigurasi Identitas Sekolah',
    defaultRoute: '/dashboard/admin/white-label',
  },
};

interface TenantAndDemoContextValue {
  config: SchoolConfig;
  activeRole: DemoRole;
  roleProfile: RoleProfile;
  language: LanguageCode;
  isMuted: boolean;
  isDemoBarOpen: boolean;
  isInCbtRoom: boolean;
  isInGameArena: boolean;
  setActiveRole: (role: DemoRole, navigateToDashboard?: boolean) => void;
  setLanguage: (lang: LanguageCode) => void;
  toggleMute: () => void;
  setDemoBarOpen: (open: boolean) => void;
  updateTenantConfig: (patch: Partial<SchoolConfig>) => Promise<SchoolConfig>;
  applyPreset: (presetKey: string) => Promise<SchoolConfig>;
}

const TenantAndDemoContext = createContext<TenantAndDemoContextValue | null>(null);

function applyCssVariables(config: SchoolConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = hexToHslComponents(config.primaryColorHex);
  const secondary = hexToHslComponents(config.secondaryColorHex);
  const accent = hexToHslComponents(config.accentColorHex);

  root.style.setProperty('--brand-primary', primary.hslString);
  root.style.setProperty('--brand-primary-fg', primary.fgString);
  root.style.setProperty('--brand-secondary', secondary.hslString);
  root.style.setProperty('--brand-accent', accent.hslString);
  document.title = `${config.schoolShortName} — ${config.schoolName}`;
}

export function TenantAndDemoProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [activeRole, setActiveRoleState] = useState<DemoRole>('STUDENT');
  const [language, setLanguage] = useState<LanguageCode>('id');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDemoBarOpen, setDemoBarOpen] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isInCbtRoom = /^\/cbt\/[^/]+\/room/.test(location.pathname);
  const isInGameArena = /^\/games\/[^/]+/.test(location.pathname);

  useEffect(() => {
    applyCssVariables(config);
  }, [config]);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.schoolName) {
          setConfig(data);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDemoBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setActiveRole = useCallback(
    (role: DemoRole, navigateToDashboard = true) => {
      setActiveRoleState(role);
      if (navigateToDashboard) {
        navigate(DEMO_ROLES[role].defaultRoute);
      }
    },
    [navigate]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const updateTenantConfig = useCallback(async (patch: Partial<SchoolConfig>): Promise<SchoolConfig> => {
    setConfig((prev) => ({ ...prev, ...patch }));
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const saved = (await res.json()) as SchoolConfig;
        setConfig(saved);
        return saved;
      }
    } catch {
      // keep optimistic update
    }
    return { ...config, ...patch };
  }, [config]);

  const applyPreset = useCallback(
    async (presetKey: string): Promise<SchoolConfig> => {
      const found = WHITE_LABEL_PRESETS.find((p) => p.key === presetKey);
      if (!found) return config;
      return updateTenantConfig(found.config);
    },
    [config, updateTenantConfig]
  );

  return (
    <TenantAndDemoContext.Provider
      value={{
        config,
        activeRole,
        roleProfile: DEMO_ROLES[activeRole],
        language,
        isMuted,
        isDemoBarOpen,
        isInCbtRoom,
        isInGameArena,
        setActiveRole,
        setLanguage,
        toggleMute,
        setDemoBarOpen,
        updateTenantConfig,
        applyPreset,
      }}
    >
      {children}
    </TenantAndDemoContext.Provider>
  );
}

export function useTenantAndDemo(): TenantAndDemoContextValue {
  const ctx = useContext(TenantAndDemoContext);
  if (!ctx) {
    throw new Error('useTenantAndDemo must be used inside TenantAndDemoProvider');
  }
  return ctx;
}

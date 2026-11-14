import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type {
  AuthSession,
  DemoRole,
  EducationalGame,
  LanguageCode,
  LearningMaterial,
  SchoolConfig,
} from '../types/lms';
import { DEFAULT_SCHOOL_CONFIG, WHITE_LABEL_PRESETS } from '../lib/seed-data';
import { hexToHslComponents } from '../lib/core-logic';
import {
  authenticateDemoAccount,
  DEMO_ACCOUNTS,
  resolveSafeRole,
} from '../lib/auth-users';

export interface RoleProfile {
  role: DemoRole;
  label: string;
  shortLabel: string;
  personName: string;
  subtitle: string;
  defaultRoute: string;
}

export const DEMO_ROLES: Record<DemoRole, RoleProfile> = {
  TEACHER: {
    role: 'TEACHER',
    label: `${DEMO_ACCOUNTS.TEACHER.roleTitle} (${DEMO_ACCOUNTS.TEACHER.displayName})`,
    shortLabel: DEMO_ACCOUNTS.TEACHER.shortLabel,
    personName: DEMO_ACCOUNTS.TEACHER.displayName,
    subtitle: DEMO_ACCOUNTS.TEACHER.subtitle,
    defaultRoute: DEMO_ACCOUNTS.TEACHER.defaultRoute,
  },
  STUDENT: {
    role: 'STUDENT',
    label: `${DEMO_ACCOUNTS.STUDENT.roleTitle} (${DEMO_ACCOUNTS.STUDENT.displayName})`,
    shortLabel: DEMO_ACCOUNTS.STUDENT.shortLabel,
    personName: DEMO_ACCOUNTS.STUDENT.displayName,
    subtitle: DEMO_ACCOUNTS.STUDENT.subtitle,
    defaultRoute: DEMO_ACCOUNTS.STUDENT.defaultRoute,
  },
  SCHOOL_ADMIN: {
    role: 'SCHOOL_ADMIN',
    label: `${DEMO_ACCOUNTS.SCHOOL_ADMIN.roleTitle} (${DEMO_ACCOUNTS.SCHOOL_ADMIN.displayName})`,
    shortLabel: DEMO_ACCOUNTS.SCHOOL_ADMIN.shortLabel,
    personName: DEMO_ACCOUNTS.SCHOOL_ADMIN.displayName,
    subtitle: DEMO_ACCOUNTS.SCHOOL_ADMIN.subtitle,
    defaultRoute: DEMO_ACCOUNTS.SCHOOL_ADMIN.defaultRoute,
  },
  OPERATIONAL: {
    role: 'OPERATIONAL',
    label: `${DEMO_ACCOUNTS.OPERATIONAL.roleTitle} (${DEMO_ACCOUNTS.OPERATIONAL.displayName})`,
    shortLabel: DEMO_ACCOUNTS.OPERATIONAL.shortLabel,
    personName: DEMO_ACCOUNTS.OPERATIONAL.displayName,
    subtitle: DEMO_ACCOUNTS.OPERATIONAL.subtitle,
    defaultRoute: DEMO_ACCOUNTS.OPERATIONAL.defaultRoute,
  },
  PARENT: {
    role: 'PARENT',
    label: `${DEMO_ACCOUNTS.PARENT.roleTitle} (${DEMO_ACCOUNTS.PARENT.displayName})`,
    shortLabel: DEMO_ACCOUNTS.PARENT.shortLabel,
    personName: DEMO_ACCOUNTS.PARENT.displayName,
    subtitle: DEMO_ACCOUNTS.PARENT.subtitle,
    defaultRoute: DEMO_ACCOUNTS.PARENT.defaultRoute,
  },
};

interface TenantAndDemoContextValue {
  config: SchoolConfig;
  activeRole: DemoRole;
  roleProfile: RoleProfile;
  authSession: AuthSession | null;
  language: LanguageCode;
  isMuted: boolean;
  isDemoBarOpen: boolean;
  isInCbtRoom: boolean;
  isInGameArena: boolean;
  uploadedMaterials: LearningMaterial[];
  aiGames: EducationalGame[];
  setActiveRole: (role: DemoRole, navigateToDashboard?: boolean) => void;
  loginWithCredentials: (username: string, password: string) => { ok: boolean; error?: string; role?: DemoRole };
  quickDemoLogin: (role: DemoRole) => void;
  logout: () => void;
  setLanguage: (lang: LanguageCode) => void;
  toggleMute: () => void;
  setDemoBarOpen: (open: boolean) => void;
  updateTenantConfig: (patch: Partial<SchoolConfig>) => Promise<SchoolConfig>;
  applyPreset: (presetKey: string) => Promise<SchoolConfig>;
  addUploadedMaterial: (material: LearningMaterial) => void;
  saveAiGame: (game: EducationalGame) => void;
}

const TenantAndDemoContext = createContext<TenantAndDemoContextValue | null>(null);
const SCHOOL_CONFIG_STORAGE_KEY = 'cendekia_school_config_v1';
const AUTH_SESSION_STORAGE_KEY = 'cendekia_auth_session_v1';
const UPLOADED_MATERIALS_STORAGE_KEY = 'cendekia_uploaded_materials_v1';
const AI_GAMES_STORAGE_KEY = 'cendekia_ai_games_v1';

function readJsonStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function readStoredSchoolConfig(): SchoolConfig | null {
  const parsed = readJsonStorage<Partial<SchoolConfig>>(SCHOOL_CONFIG_STORAGE_KEY);
  if (!parsed || typeof parsed.schoolName !== 'string') return null;
  return { ...DEFAULT_SCHOOL_CONFIG, ...parsed };
}

function readStoredAuthSession(): AuthSession | null {
  const parsed = readJsonStorage<AuthSession>(AUTH_SESSION_STORAGE_KEY);
  if (!parsed || !parsed.isAuthenticated) return null;
  return {
    ...parsed,
    role: resolveSafeRole(parsed.role),
  };
}

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
  const [config, setConfig] = useState<SchoolConfig>(
    () => readStoredSchoolConfig() || DEFAULT_SCHOOL_CONFIG
  );
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => readStoredAuthSession());
  const [activeRole, setActiveRoleState] = useState<DemoRole>(
    () => readStoredAuthSession()?.role || 'STUDENT'
  );
  const [language, setLanguage] = useState<LanguageCode>('id');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDemoBarOpen, setDemoBarOpen] = useState<boolean>(false);
  const [uploadedMaterials, setUploadedMaterials] = useState<LearningMaterial[]>(
    () => readJsonStorage<LearningMaterial[]>(UPLOADED_MATERIALS_STORAGE_KEY) || []
  );
  const [aiGames, setAiGames] = useState<EducationalGame[]>(
    () => readJsonStorage<EducationalGame[]>(AI_GAMES_STORAGE_KEY) || []
  );

  const location = useLocation();
  const navigate = useNavigate();

  const isInCbtRoom = /^\/cbt\/[^/]+\/room/.test(location.pathname);
  const isInGameArena = /^\/games\/[^/]+/.test(location.pathname);

  useEffect(() => {
    applyCssVariables(config);
    writeJsonStorage(SCHOOL_CONFIG_STORAGE_KEY, config);
  }, [config]);

  useEffect(() => {
    const localStored = readStoredSchoolConfig();
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SchoolConfig | null) => {
        if (data && data.schoolName) {
          if (!localStored) {
            setConfig(data);
          } else {
            const localTime = Date.parse(localStored.updatedAt || '0') || 0;
            const serverTime = Date.parse(data.updatedAt || '0') || 0;
            if (serverTime > localTime) {
              setConfig(data);
            }
          }
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

  const persistSessionForRole = useCallback((role: DemoRole) => {
    const account = DEMO_ACCOUNTS[role];
    const nextSession: AuthSession = {
      isAuthenticated: true,
      role,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      loggedInAt: new Date().toISOString(),
    };
    setAuthSession(nextSession);
    setActiveRoleState(role);
    writeJsonStorage(AUTH_SESSION_STORAGE_KEY, nextSession);
  }, []);

  const setActiveRole = useCallback(
    (role: DemoRole, navigateToDashboard = true) => {
      const safe = resolveSafeRole(role);
      persistSessionForRole(safe);
      if (navigateToDashboard) {
        navigate(DEMO_ROLES[safe].defaultRoute);
      }
    },
    [navigate, persistSessionForRole]
  );

  const loginWithCredentials = useCallback(
    (username: string, password: string): { ok: boolean; error?: string; role?: DemoRole } => {
      const account = authenticateDemoAccount(username, password);
      if (!account) {
        return {
          ok: false,
          error: 'Username atau kata sandi tidak cocok. Gunakan akun demo atau tombol Masuk Instan di bawah.',
        };
      }
      persistSessionForRole(account.role);
      navigate(account.defaultRoute);
      return { ok: true, role: account.role };
    },
    [navigate, persistSessionForRole]
  );

  const quickDemoLogin = useCallback(
    (role: DemoRole) => {
      const safe = resolveSafeRole(role);
      persistSessionForRole(safe);
      navigate(DEMO_ROLES[safe].defaultRoute);
    },
    [navigate, persistSessionForRole]
  );

  const logout = useCallback(() => {
    setAuthSession(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setDemoBarOpen(false);
    navigate('/login');
  }, [navigate]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const updateTenantConfig = useCallback(
    async (patch: Partial<SchoolConfig>): Promise<SchoolConfig> => {
      const optimistic: SchoolConfig = {
        ...config,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      setConfig(optimistic);
      writeJsonStorage(SCHOOL_CONFIG_STORAGE_KEY, optimistic);
      applyCssVariables(optimistic);
      try {
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const saved = (await res.json()) as SchoolConfig;
          setConfig(saved);
          writeJsonStorage(SCHOOL_CONFIG_STORAGE_KEY, saved);
          return saved;
        }
      } catch {
        // keep optimistic localStorage update
      }
      return optimistic;
    },
    [config]
  );

  const applyPreset = useCallback(
    async (presetKey: string): Promise<SchoolConfig> => {
      const found = WHITE_LABEL_PRESETS.find((p) => p.key === presetKey);
      if (!found) return config;
      return updateTenantConfig(found.config);
    },
    [config, updateTenantConfig]
  );

  const addUploadedMaterial = useCallback((material: LearningMaterial) => {
    setUploadedMaterials((prev) => {
      const filtered = prev.filter((m) => m.slug !== material.slug && m.id !== material.id);
      const next = [material, ...filtered];
      // Persist to localStorage (keep pdfDataUrl for < 3MB files, strip runtime blob URLs before serializing)
      const serializable = next.map((item) => ({
        ...item,
        pdfObjectUrl: undefined,
      }));
      writeJsonStorage(UPLOADED_MATERIALS_STORAGE_KEY, serializable);
      return next;
    });
  }, []);

  const saveAiGame = useCallback((game: EducationalGame) => {
    setAiGames((prev) => {
      const filtered = prev.filter((g) => g.slug !== game.slug && g.id !== game.id);
      const next = [game, ...filtered];
      writeJsonStorage(AI_GAMES_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const safeRole = resolveSafeRole(activeRole);

  return (
    <TenantAndDemoContext.Provider
      value={{
        config,
        activeRole: safeRole,
        roleProfile: DEMO_ROLES[safeRole],
        authSession,
        language,
        isMuted,
        isDemoBarOpen,
        isInCbtRoom,
        isInGameArena,
        uploadedMaterials,
        aiGames,
        setActiveRole,
        loginWithCredentials,
        quickDemoLogin,
        logout,
        setLanguage,
        toggleMute,
        setDemoBarOpen,
        updateTenantConfig,
        applyPreset,
        addUploadedMaterial,
        saveAiGame,
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

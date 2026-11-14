import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  HeartHandshake,
  Lock,
  LogIn,
  Radar,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { SchoolCrestLogo } from '../components/layout/SchoolCrestLogo';
import { DEMO_ACCOUNT_LIST } from '../lib/auth-users';
import type { DemoRole } from '../types/lms';

const ROLE_ICONS: Record<DemoRole, React.ComponentType<{ className?: string }>> = {
  TEACHER: GraduationCap,
  STUDENT: User,
  SCHOOL_ADMIN: Building2,
  OPERATIONAL: Radar,
  PARENT: HeartHandshake,
};

export function LoginPage() {
  const { config, loginWithCredentials, quickDemoLogin } = useTenantAndDemo();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeQuickRole, setActiveQuickRole] = useState<DemoRole | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = loginWithCredentials(username, password);
    if (!result.ok) {
      setErrorMsg(result.error || 'Gagal masuk.');
    }
  };

  const handleInstantLogin = (role: DemoRole, demoUser: string, demoPass: string) => {
    setErrorMsg(null);
    setActiveQuickRole(role);
    setUsername(demoUser);
    setPassword(demoPass);
    window.setTimeout(() => {
      quickDemoLogin(role);
    }, 180);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="font-mono text-xs text-slate-500">NPSN {config.npsn}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Branded School Hero + Credentials Form */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 shadow-sm">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-6">
              <SchoolCrestLogo className="h-12 w-12 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide text-brand-primary uppercase">
                  Portal Autentikasi Terpadu
                </p>
                <h1 className="truncate text-xl sm:text-2xl font-extrabold text-slate-900">
                  {config.schoolName}
                </h1>
                <p className="truncate text-xs text-slate-500">{config.tagline}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700">
                  Username atau Email Sekolah
                </label>
                <div className="relative mt-1.5">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: guru.hendra atau siswa.ahmad"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg shadow-xs transition-opacity hover:opacity-90"
              >
                <LogIn className="h-4 w-4" />
                <span>Masuk ke Portal {config.schoolShortName}</span>
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-primary" />
              <span>
                Sesi terenkripsi & terhubung dengan kontrol CBT, AI Studio, serta E-Rapor SHA-256.
              </span>
            </div>
          </div>

          {/* Right Column: 5-Role 1-Click Quick Demo Login Cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-brand-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Mode Presentasi Klien
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                    Masuk Instan (Mode Demo Presentasi)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pilih salah satu dari 5 peran untuk langsung mengisi kredensial dan membuka dashboard terkait.
                  </p>
                </div>
                <Users className="h-6 w-6 shrink-0 text-slate-300" />
              </div>

              <div className="mt-4 space-y-2.5">
                {DEMO_ACCOUNT_LIST.map((acc) => {
                  const Icon = ROLE_ICONS[acc.role];
                  const isLoading = activeQuickRole === acc.role;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      data-quick-role={acc.role}
                      onClick={() => handleInstantLogin(acc.role, acc.username, acc.password)}
                      className={`group flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        isLoading
                          ? 'border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary'
                          : 'border-slate-200 bg-slate-50/70 hover:border-brand-primary hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{acc.roleTitle}</span>
                            <span className="font-mono text-[11px] text-slate-500">
                              @{acc.username}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{acc.displayName}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                            {acc.accessSummary}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 self-center rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-bold text-brand-primary-fg opacity-90 group-hover:opacity-100">
                        {isLoading ? 'Masuk...' : 'Masuk 1-Klik'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { SchoolCrestLogo } from './SchoolCrestLogo';

export function Navbar() {
  const { config, roleProfile, authSession, language, isInCbtRoom, isInGameArena } = useTenantAndDemo();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide global top bar on /login, Zen CBT Exam Room and immersive Game Arena Shell
  if (isInCbtRoom || isInGameArena || location.pathname === '/login') {
    return null;
  }

  const navItems =
    language === 'en'
      ? [
          { to: '/', label: 'Home' },
          { to: '/games', label: 'Games' },
          { to: '/materials', label: 'Library' },
          { to: '/virtual-lab', label: 'Virtual Lab' },
          { to: '/cbt', label: 'CBT Exam' },
        ]
      : [
          { to: '/', label: 'Beranda' },
          { to: '/games', label: 'Katalog Game' },
          { to: '/materials', label: 'Materi' },
          { to: '/virtual-lab', label: 'Virtual Lab' },
          { to: '/cbt', label: 'Ujian CBT' },
        ];

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const primaryCtaTo = authSession?.isAuthenticated ? roleProfile.defaultRoute : '/login';
  const primaryCtaLabel = authSession?.isAuthenticated
    ? language === 'en'
      ? 'Open Portal'
      : 'Buka Portal'
    : language === 'en'
    ? 'Sign In'
    : 'Masuk / Login';

  return (
    <header className="no-print print:hidden sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          <SchoolCrestLogo className="h-8 w-8 shrink-0" />
          <span>{config.schoolShortName}</span>
        </Link>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-slate-900 ${
                isActive(item.to)
                  ? 'text-brand-primary font-semibold underline decoration-2 underline-offset-8'
                  : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: 1 Primary CTA (plus mobile menu button on <768px only) */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={primaryCtaTo}
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary-fg shadow-xs transition-opacity hover:opacity-90 whitespace-nowrap shrink-0"
          >
            {primaryCtaLabel}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileOpen}
            className="md:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Navigasi Mobile"
          className="md:hidden border-t border-slate-100 bg-white px-6 py-3 space-y-1"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(item.to)
                  ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/erapor"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            E-Rapor & QR Vault
          </Link>
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-brand-primary hover:bg-slate-50"
          >
            Halaman Login Multi-Role
          </Link>
        </nav>
      )}
    </header>
  );
}

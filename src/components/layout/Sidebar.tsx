import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Gamepad2,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  FileBadge2,
  Palette,
  Radar,
  GraduationCap,
  HeartHandshake,
  LogOut,
} from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import type { DemoRole } from '../../types/lms';

export function Sidebar() {
  const { activeRole, roleProfile, config, isInCbtRoom, isInGameArena, logout } = useTenantAndDemo();
  const location = useLocation();

  const showSidebar =
    !isInCbtRoom &&
    !isInGameArena &&
    location.pathname !== '/login' &&
    (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/erapor'));

  if (!showSidebar) return null;

  const links: Array<{
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    roles: DemoRole[];
  }> = [
    {
      to: '/dashboard/student',
      label: 'Dashboard Siswa',
      icon: LayoutDashboard,
      roles: ['STUDENT', 'TEACHER', 'SCHOOL_ADMIN', 'OPERATIONAL'],
    },
    {
      to: '/dashboard/teacher',
      label: 'Studio Guru & AI Game',
      icon: GraduationCap,
      roles: ['TEACHER', 'SCHOOL_ADMIN'],
    },
    {
      to: '/dashboard/proctor',
      label: 'Operasional & Pengawas CBT',
      icon: Radar,
      roles: ['OPERATIONAL', 'SCHOOL_ADMIN', 'TEACHER'],
    },
    {
      to: '/dashboard/admin/white-label',
      label: 'Admin Sekolah & White-Label',
      icon: Palette,
      roles: ['SCHOOL_ADMIN'],
    },
    {
      to: '/dashboard/parent',
      label: 'Portal Wali Murid',
      icon: HeartHandshake,
      roles: ['PARENT', 'SCHOOL_ADMIN'],
    },
    {
      to: '/erapor',
      label: 'E-Rapor & QR Vault',
      icon: FileBadge2,
      roles: ['STUDENT', 'TEACHER', 'SCHOOL_ADMIN', 'OPERATIONAL', 'PARENT'],
    },
  ];

  const shortcuts = [
    { to: '/games', label: 'Katalog Game', icon: Gamepad2 },
    { to: '/materials', label: 'Perpustakaan PDF', icon: BookOpen },
    { to: '/virtual-lab', label: 'Virtual Lab', icon: FlaskConical },
    { to: '/cbt', label: 'Lobi Ujian CBT', icon: ShieldCheck },
  ];

  return (
    <aside className="no-print print:hidden hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6">
      <div>
        <div className="mb-6 border-b border-slate-100 pb-4">
          <p className="text-xs font-medium text-slate-500">Peran Aktif · {config.schoolShortName}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{roleProfile.personName}</p>
          <p className="truncate text-xs text-slate-500">{roleProfile.subtitle}</p>
        </div>

        <nav aria-label="Menu Portal" className="space-y-1">
          <p className="px-2 pb-1.5 text-xs font-semibold text-slate-400">Ruang Kerja</p>
          {links
            .filter((l) => l.roles.includes(activeRole))
            .map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-5 space-y-1">
          <p className="px-2 pb-1.5 text-xs font-semibold text-slate-400">Modul Pembelajaran</p>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout / Ganti Akun</span>
        </button>
      </div>
    </aside>
  );
}

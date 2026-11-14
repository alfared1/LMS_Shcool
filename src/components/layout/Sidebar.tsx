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
} from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';

export function Sidebar() {
  const { activeRole, roleProfile, config, isInCbtRoom, isInGameArena } = useTenantAndDemo();
  const location = useLocation();

  const showSidebar =
    !isInCbtRoom &&
    !isInGameArena &&
    (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/erapor'));

  if (!showSidebar) return null;

  const links = [
    {
      to: '/dashboard/student',
      label: 'Dashboard Siswa',
      icon: LayoutDashboard,
      roles: ['STUDENT', 'TEACHER', 'PROCTOR', 'SUPER_ADMIN'],
    },
    {
      to: '/dashboard/teacher',
      label: 'Studio Guru & Nilai',
      icon: GraduationCap,
      roles: ['TEACHER', 'SUPER_ADMIN', 'STUDENT'],
    },
    {
      to: '/dashboard/proctor',
      label: 'Komando Pengawas CBT',
      icon: Radar,
      roles: ['PROCTOR', 'SUPER_ADMIN', 'TEACHER', 'STUDENT'],
    },
    {
      to: '/dashboard/admin/white-label',
      label: 'White-Label Studio',
      icon: Palette,
      roles: ['SUPER_ADMIN', 'PROCTOR', 'TEACHER', 'STUDENT'],
    },
    {
      to: '/erapor',
      label: 'E-Rapor & QR Vault',
      icon: FileBadge2,
      roles: ['STUDENT', 'TEACHER', 'SUPER_ADMIN', 'PROCTOR'],
    },
  ];

  const shortcuts = [
    { to: '/games', label: 'Katalog Game', icon: Gamepad2 },
    { to: '/materials', label: 'Perpustakaan', icon: BookOpen },
    { to: '/virtual-lab', label: 'Virtual Lab', icon: FlaskConical },
    { to: '/cbt', label: 'Lobi Ujian CBT', icon: ShieldCheck },
  ];

  return (
    <aside className="no-print print:hidden hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
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
    </aside>
  );
}

import type { DemoRole } from '../types/lms';

export interface DemoAccount {
  role: DemoRole;
  roleTitle: string;
  shortLabel: string;
  username: string;
  email: string;
  password: string;
  displayName: string;
  subtitle: string;
  defaultRoute: string;
  accessSummary: string;
}

export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  TEACHER: {
    role: 'TEACHER',
    roleTitle: 'Guru',
    shortLabel: 'Guru · Ustadz Hendra',
    username: 'guru.hendra',
    email: 'hendra.mpd@cendekia.sch.id',
    password: 'Guru2026!',
    displayName: 'Ustadz Hendra, M.Pd',
    subtitle: 'NIP 19840511 201001 1 008 · Guru Informatika',
    defaultRoute: '/dashboard/teacher',
    accessSummary: 'Studio Guru, Unggah PDF, AI Game Studio & Input Nilai E-Rapor',
  },
  STUDENT: {
    role: 'STUDENT',
    roleTitle: 'Siswa',
    shortLabel: 'Siswa · Ahmad Fauzi',
    username: 'siswa.ahmad',
    email: 'ahmad.fauzi@siswa.cendekia.sch.id',
    password: 'Siswa2026!',
    displayName: 'Ahmad Fauzi',
    subtitle: 'NISN 0084921034 · Kelas X-IPA-1',
    defaultRoute: '/dashboard/student',
    accessSummary: 'Dashboard Siswa, Perpustakaan PDF, Game Edukasi, CBT & AI Tutor',
  },
  SCHOOL_ADMIN: {
    role: 'SCHOOL_ADMIN',
    roleTitle: 'Administrator Sekolah',
    shortLabel: 'Admin Sekolah · White-Label',
    username: 'admin.sekolah',
    email: 'admin@cendekia.sch.id',
    password: 'Admin2026!',
    displayName: 'Drs. Bagus Pratama',
    subtitle: 'Kepala Tata Usaha & Administrator Multi-Tenant',
    defaultRoute: '/dashboard/admin/white-label',
    accessSummary: 'White-Label Customizer, Manajemen Pengguna, Tahun Ajaran & Kurikulum',
  },
  OPERATIONAL: {
    role: 'OPERATIONAL',
    roleTitle: 'Operasional',
    shortLabel: 'Operasional · Ibu Rina',
    username: 'op.rina',
    email: 'rina.proctor@cendekia.sch.id',
    password: 'Ops2026!',
    displayName: 'Ibu Rina, S.Pd',
    subtitle: 'Pengawas CBT, Jadwal Ruang Kelas & Audit Keamanan',
    defaultRoute: '/dashboard/proctor',
    accessSummary: 'Komando Pengawas CBT, Unlock/Reset Ujian, Jadwal Ruang & Log Audit',
  },
  PARENT: {
    role: 'PARENT',
    roleTitle: 'Orang Tua Siswa',
    shortLabel: 'Orang Tua · Bpk. Ridwan',
    username: 'wali.fauzi',
    email: 'ridwan.fauzi@wali.cendekia.sch.id',
    password: 'Wali2026!',
    displayName: 'Bpk. H. Ridwan Fauzi',
    subtitle: 'Wali Murid · Ahmad Fauzi (Kelas X-IPA-1)',
    defaultRoute: '/dashboard/parent',
    accessSummary: 'Portal Wali Murid, Grafik Nilai Anak, Riwayat CBT & Unduh E-Rapor QR',
  },
};

export const DEMO_ACCOUNT_LIST: DemoAccount[] = [
  DEMO_ACCOUNTS.TEACHER,
  DEMO_ACCOUNTS.STUDENT,
  DEMO_ACCOUNTS.SCHOOL_ADMIN,
  DEMO_ACCOUNTS.OPERATIONAL,
  DEMO_ACCOUNTS.PARENT,
];

export function resolveSafeRole(input: string | null | undefined): DemoRole {
  if (!input) return 'STUDENT';
  if (input === 'PROCTOR') return 'OPERATIONAL';
  if (input === 'SUPER_ADMIN') return 'SCHOOL_ADMIN';
  if (
    input === 'TEACHER' ||
    input === 'STUDENT' ||
    input === 'SCHOOL_ADMIN' ||
    input === 'OPERATIONAL' ||
    input === 'PARENT'
  ) {
    return input;
  }
  return 'STUDENT';
}

export function authenticateDemoAccount(usernameOrEmail: string, password: string): DemoAccount | null {
  const normalized = usernameOrEmail.trim().toLowerCase();
  if (!normalized || !password) return null;
  const account = DEMO_ACCOUNT_LIST.find(
    (acc) => acc.username.toLowerCase() === normalized || acc.email.toLowerCase() === normalized
  );
  if (!account) return null;
  if (account.password !== password) return null;
  return account;
}

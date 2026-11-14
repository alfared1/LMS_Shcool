import React, { useEffect, useState, useRef } from 'react';
import { BookMarked, CheckCircle2, Palette, Save, Users } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { WHITE_LABEL_PRESETS } from '../lib/seed-data';
import { DEMO_ACCOUNT_LIST } from '../lib/auth-users';
import { SchoolCrestLogo } from '../components/layout/SchoolCrestLogo';
import type { SchoolConfig } from '../types/lms';

export function WhiteLabelAdminPage() {
  const { config, updateTenantConfig, applyPreset, setActiveRole } = useTenantAndDemo();
  const [adminTab, setAdminTab] = useState<'whitelabel' | 'users' | 'curriculum'>('whitelabel');
  const [form, setForm] = useState<SchoolConfig>(config);
  const [academicYear, setAcademicYear] = useState('2026/2027 - Semester Ganjil');
  const [defaultKkm, setDefaultKkm] = useState(75);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const showToastMsg = (msg: string) => {
    setSavedToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTenantConfig(form);
    showToastMsg(`Identitas "${form.schoolName}" berhasil diterapkan ke seluruh sistem & E-Rapor.`);
  };

  const handlePresetClick = async (presetKey: string) => {
    const next = await applyPreset(presetKey);
    setForm(next);
    showToastMsg(`Preset "${next.schoolName}" langsung diaktifkan!`);
  };

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-brand-primary">ADMINISTRATOR SEKOLAH · KONFIGURASI MULTI-TENANT</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Admin Sekolah & White-Label Studio
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola identitas sekolah, warna tema, akun pengguna, tahun ajaran, dan kurikulum nasional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: 'whitelabel', label: 'White-Label Customizer', icon: Palette },
            { id: 'users', label: 'Manajemen Pengguna', icon: Users },
            { id: 'curriculum', label: 'Tahun Ajaran & Kurikulum', icon: BookMarked },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdminTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                  adminTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {savedToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {adminTab === 'users' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Manajemen Pengguna & Hak Akses (5 Role Aktif)</h2>
            <p className="text-xs text-slate-500">
              Daftar akun resmi ekosistem {config.schoolName} yang terhubung dengan halaman Login & Portal masing-masing.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pr-4">Nama Pengguna</th>
                  <th className="py-3 px-3">Peran (Role)</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Cakupan Akses</th>
                  <th className="py-3 pl-3 text-right">Uji Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEMO_ACCOUNT_LIST.map((acc) => (
                  <tr key={acc.role} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{acc.displayName}</td>
                    <td className="py-3 px-3 font-mono text-xs font-bold text-brand-primary">{acc.roleTitle}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">{acc.username}</td>
                    <td className="py-3 px-3 text-xs text-slate-600">{acc.accessSummary}</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveRole(acc.role, true)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary"
                      >
                        Buka Portal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {adminTab === 'curriculum' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tahun Ajaran & Standar Kurikulum</h2>
            <p className="text-xs text-slate-500">
              Pengaturan global untuk E-Rapor, perhitungan KKM, dan AI Studio sekolah.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Tahun Ajaran Aktif</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="2026/2027 - Semester Ganjil">2026/2027 - Semester Ganjil</option>
                <option value="2026/2027 - Semester Genap">2026/2027 - Semester Genap</option>
                <option value="2027/2028 - Semester Ganjil">2027/2028 - Semester Ganjil</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Jenis Kurikulum</label>
              <select
                value={form.curriculumType}
                onChange={(e) => setForm({ ...form, curriculumType: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="KURIKULUM_MERDEKA">Kurikulum Merdeka</option>
                <option value="K13_REVISI">Kurikulum 2013 Revisi</option>
                <option value="CAMBRIDGE_MERDEKA_HYBRID">Cambridge + Merdeka Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Standar KKM Sekolah</label>
              <input
                type="number"
                min={60}
                max={90}
                value={defaultKkm}
                onChange={(e) => setDefaultKkm(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateTenantConfig({ curriculumType: form.curriculumType });
              showToastMsg(`Tahun ajaran "${academicYear}" & Kurikulum "${form.curriculumType}" disimpan.`);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-brand-primary-fg hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            <span>Simpan Pengaturan Kurikulum</span>
          </button>
        </section>
      )}

      {adminTab === 'whitelabel' && (
        <>

      {/* 3 Instant School Presets */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-brand-primary" />
          <h2 className="text-base font-bold text-slate-900">3 Preset Sekolah Instan (1-Klik Demo)</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {WHITE_LABEL_PRESETS.map((preset) => {
            const isCurrent = config.schoolShortName === preset.config.schoolShortName;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetClick(preset.key)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isCurrent
                    ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: preset.config.primaryColorHex }}
                  />
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: preset.config.secondaryColorHex }}
                  />
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: preset.config.accentColorHex }}
                  />
                </div>
                <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                <p className="mt-1 text-xs text-slate-500">{preset.subtitle}</p>
                <p className="mt-2 font-mono text-xs font-semibold text-brand-primary">
                  AI: {preset.config.aiTutorName}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Custom White-Label Form */}
      <form
        onSubmit={handleSave}
        className="grid gap-6 lg:grid-cols-12 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div className="lg:col-span-8 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Nama Lengkap Sekolah</label>
            <input
              type="text"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Nama Singkat (Navbar)</label>
            <input
              type="text"
              value={form.schoolShortName}
              onChange={(e) => setForm({ ...form, schoolShortName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">NPSN</label>
            <input
              type="text"
              value={form.npsn}
              onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Slogan / Tagline Sekolah</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Alamat Resmi (Kop E-Rapor)</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Kepala Sekolah (Penandatangan Rapor)</label>
            <input
              type="text"
              value={form.principalName}
              onChange={(e) => setForm({ ...form, principalName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">NIP Kepala Sekolah</label>
            <input
              type="text"
              value={form.principalNip}
              onChange={(e) => setForm({ ...form, principalNip: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Nama Asisten AI Tutor</label>
            <input
              type="text"
              value={form.aiTutorName}
              onChange={(e) => setForm({ ...form, aiTutorName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Color Pickers & Live Preview */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Palet Warna Brand</h3>

            <div className="flex items-center justify-between">
              <label htmlFor="color-primary" className="text-xs font-medium text-slate-700">
                Warna Utama (Primary)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="color-primary"
                  type="color"
                  value={form.primaryColorHex}
                  onChange={(e) => {
                    const next = { ...form, primaryColorHex: e.target.value };
                    setForm(next);
                    updateTenantConfig({ primaryColorHex: e.target.value });
                  }}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                />
                <span className="font-mono text-xs text-slate-600">{form.primaryColorHex}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="color-secondary" className="text-xs font-medium text-slate-700">
                Warna Sekunder
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="color-secondary"
                  type="color"
                  value={form.secondaryColorHex}
                  onChange={(e) => {
                    const next = { ...form, secondaryColorHex: e.target.value };
                    setForm(next);
                    updateTenantConfig({ secondaryColorHex: e.target.value });
                  }}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                />
                <span className="font-mono text-xs text-slate-600">{form.secondaryColorHex}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="color-accent" className="text-xs font-medium text-slate-700">
                Warna Aksen (Gamifikasi)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="color-accent"
                  type="color"
                  value={form.accentColorHex}
                  onChange={(e) => {
                    const next = { ...form, accentColorHex: e.target.value };
                    setForm(next);
                    updateTenantConfig({ accentColorHex: e.target.value });
                  }}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200"
                />
                <span className="font-mono text-xs text-slate-600">{form.accentColorHex}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold text-slate-500 mb-2">Pratinjau Kop Sekolah</p>
              <div className="flex items-center gap-3">
                <SchoolCrestLogo className="h-10 w-10 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{form.schoolName}</p>
                  <p className="truncate text-xs text-slate-500">NPSN {form.npsn}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-fg hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            <span>Simpan Konfigurasi White-Label</span>
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  );
}

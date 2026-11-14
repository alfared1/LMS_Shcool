import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Palette, Save } from 'lucide-react';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { WHITE_LABEL_PRESETS } from '../lib/seed-data';
import { SchoolCrestLogo } from '../components/layout/SchoolCrestLogo';
import type { SchoolConfig } from '../types/lms';

export function WhiteLabelAdminPage() {
  const { config, updateTenantConfig, applyPreset } = useTenantAndDemo();
  const [form, setForm] = useState<SchoolConfig>(config);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTenantConfig(form);
    setSavedToast(`Identitas "${form.schoolName}" berhasil diterapkan ke seluruh sistem & E-Rapor.`);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSavedToast(null), 3500);
  };

  const handlePresetClick = async (presetKey: string) => {
    const next = await applyPreset(presetKey);
    setForm(next);
    setSavedToast(`Preset "${next.schoolName}" langsung diaktifkan!`);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSavedToast(null), 3000);
  };

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold text-brand-primary">SUPER ADMIN · KONFIGURASI MULTI-TENANT</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
          White-Label Studio & Pengubah Identitas Sekolah
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Ubah nama sekolah, palet warna CSS Variables, pejabat penandatangan E-Rapor, dan persona AI Tutor secara instan tanpa menyentuh kode.
        </p>
      </div>

      {savedToast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BookOpen, FileText, Newspaper, X } from 'lucide-react';
import { SEED_MATERIALS } from '../lib/seed-data';
import type { LearningMaterial } from '../types/lms';

const TYPE_LABEL: Record<LearningMaterial['materialType'], string> = {
  MODUL_PDF: 'Modul PDF',
  INTERACTIVE_LKPD: 'LKPD Interaktif',
  ARTICLE_BLOG: 'Artikel Akademik',
};

export function MaterialsPage() {
  const [materials, setMaterials] = useState<LearningMaterial[]>(SEED_MATERIALS);
  const [typeFilter, setTypeFilter] = useState<'ALL' | LearningMaterial['materialType']>('ALL');
  const [selected, setSelected] = useState<LearningMaterial | null>(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setMaterials(data);
      })
      .catch(() => undefined);
  }, []);

  const openMaterial = (mat: LearningMaterial) => {
    setSelected(mat);
    fetch(`/api/materials/${mat.slug}/view`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.viewsCount) {
          setMaterials((prev) =>
            prev.map((m) => (m.slug === mat.slug ? { ...m, viewsCount: data.viewsCount } : m))
          );
        }
      })
      .catch(() => undefined);
  };

  const filtered = materials.filter((m) => typeFilter === 'ALL' || m.materialType === typeFilter);

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Perpustakaan Materi & LKPD</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Koleksi modul ajar terstruktur, lembar kerja peserta didik, dan artikel literasi digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: 'ALL', label: 'Semua' },
            { id: 'MODUL_PDF', label: 'Modul PDF' },
            { id: 'INTERACTIVE_LKPD', label: 'LKPD' },
            { id: 'ARTICLE_BLOG', label: 'Artikel' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
                typeFilter === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((mat) => (
          <article
            key={mat.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-brand-primary">
                  {TYPE_LABEL[mat.materialType]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{mat.subjectName}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {mat.level} Kelas {mat.gradeLevel}
                </span>
              </div>
              <h2 className="mt-2.5 text-xl font-bold text-slate-900">{mat.title}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{mat.summary}</p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500">
                <span>{mat.authorName}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{mat.viewsCount}x dibaca</span>
              </div>
              <button
                type="button"
                onClick={() => openMaterial(mat)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-primary-fg hover:opacity-90"
              >
                {mat.materialType === 'MODUL_PDF' ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : mat.materialType === 'INTERACTIVE_LKPD' ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : (
                  <Newspaper className="h-3.5 w-3.5" />
                )}
                <span>Baca Materi</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold text-brand-primary">
                  {TYPE_LABEL[selected.materialType]} · {selected.subjectName}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{selected.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Penulis: {selected.authorName} · Estimasi baca {selected.readMinutes} menit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Tutup pembaca materi"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {selected.contentMarkdown}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Newspaper, Search } from 'lucide-react';
import { SEED_MATERIALS } from '../lib/seed-data';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { PdfMaterialViewerModal } from '../components/materials/PdfMaterialViewerModal';
import type { LearningMaterial } from '../types/lms';

const TYPE_LABEL: Record<LearningMaterial['materialType'], string> = {
  MODUL_PDF: 'Modul PDF',
  INTERACTIVE_LKPD: 'LKPD Interaktif',
  ARTICLE_BLOG: 'Artikel Akademik',
};

export function MaterialsPage() {
  const { uploadedMaterials } = useTenantAndDemo();
  const [serverMaterials, setServerMaterials] = useState<LearningMaterial[]>(SEED_MATERIALS);
  const [typeFilter, setTypeFilter] = useState<'ALL' | LearningMaterial['materialType']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<LearningMaterial | null>(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setServerMaterials(data);
      })
      .catch(() => undefined);
  }, []);

  const materials = useMemo(() => {
    const map = new Map<string, LearningMaterial>();
    for (const m of uploadedMaterials) {
      map.set(m.slug, m);
    }
    for (const m of serverMaterials) {
      if (!map.has(m.slug)) {
        map.set(m.slug, m);
      } else {
        const existing = map.get(m.slug)!;
        map.set(m.slug, {
          ...m,
          ...existing,
          pdfObjectUrl: existing.pdfObjectUrl || m.pdfObjectUrl,
          pdfDataUrl: existing.pdfDataUrl || m.pdfDataUrl,
        });
      }
    }
    return Array.from(map.values());
  }, [uploadedMaterials, serverMaterials]);

  const openMaterial = (mat: LearningMaterial) => {
    setSelected(mat);
    fetch(`/api/materials/${mat.slug}/view`, { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.viewsCount) {
          setServerMaterials((prev) =>
            prev.map((m) => (m.slug === mat.slug ? { ...m, viewsCount: data.viewsCount } : m))
          );
        }
      })
      .catch(() => undefined);
  };

  const filtered = materials.filter((m) => {
    if (typeFilter !== 'ALL' && m.materialType !== typeFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      m.subjectName.toLowerCase().includes(q) ||
      m.authorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">
            REPOSITORI DIGITAL LINTAS ROLE
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Perpustakaan Materi & Modul PDF
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Koleksi modul PDF dari guru, lembar kerja peserta didik, dan artikel literasi digital yang dapat dibaca dan diunduh oleh seluruh peran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-56 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, mapel, guru..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-brand-primary focus:outline-none"
            />
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
                className={`rounded-md px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  typeFilter === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((mat) => (
          <article
            key={mat.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-brand-primary">
                  {TYPE_LABEL[mat.materialType]}
                </span>
                <span aria-hidden="true">·</span>
                <span>{mat.subjectName}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {mat.level} Kelas {mat.gradeLevel}
                </span>
                {mat.fileSizeLabel && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-600">{mat.fileSizeLabel}</span>
                  </>
                )}
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-primary-fg hover:opacity-90 whitespace-nowrap"
              >
                {mat.materialType === 'MODUL_PDF' ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : mat.materialType === 'INTERACTIVE_LKPD' ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : (
                  <Newspaper className="h-3.5 w-3.5" />
                )}
                <span>{mat.materialType === 'MODUL_PDF' ? 'Baca Modul PDF' : 'Baca Materi'}</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      <PdfMaterialViewerModal
        material={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

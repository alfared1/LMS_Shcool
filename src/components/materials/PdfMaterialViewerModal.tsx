import { useEffect, useState } from 'react';
import { BookOpen, Download, ExternalLink, FileText, Newspaper, X } from 'lucide-react';
import { resolveMaterialPdfUrl } from '../../lib/pdf-helper';
import type { LearningMaterial } from '../../types/lms';

const TYPE_LABEL: Record<LearningMaterial['materialType'], string> = {
  MODUL_PDF: 'Modul PDF',
  INTERACTIVE_LKPD: 'LKPD Interaktif',
  ARTICLE_BLOG: 'Artikel Akademik',
};

interface PdfMaterialViewerModalProps {
  material: LearningMaterial | null;
  onClose: () => void;
}

export function PdfMaterialViewerModal({ material, onClose }: PdfMaterialViewerModalProps) {
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!material) {
      setResolvedPdfUrl(null);
      return;
    }

    const isPdfCapable = material.materialType === 'MODUL_PDF' || Boolean(material.pdfDataUrl || material.fileName);
    if (!isPdfCapable) {
      setResolvedPdfUrl(null);
      return;
    }

    const url = resolveMaterialPdfUrl(material);
    setResolvedPdfUrl(url);

    return () => {
      if (url && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore revoke errors
        }
      }
    };
  }, [material]);

  if (!material) return null;

  const isPdfView = material.materialType === 'MODUL_PDF' || Boolean(material.pdfDataUrl || material.fileName);
  const downloadName = material.fileName || `${material.slug || 'modul-materi'}.pdf`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={material.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
    >
      <div
        className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl ${
          isPdfView ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-primary">
              <span>{TYPE_LABEL[material.materialType]}</span>
              <span aria-hidden="true">·</span>
              <span>{material.subjectName}</span>
              <span aria-hidden="true">·</span>
              <span>
                {material.level} Kelas {material.gradeLevel}
              </span>
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">{material.title}</h3>
            <p className="mt-1 text-xs text-slate-600">
              Guru Pengunggah: <strong className="text-slate-800">{material.authorName}</strong>
              {material.fileName ? ` · Berkas: ${material.fileName}` : ''}
              {material.fileSizeLabel ? ` (${material.fileSizeLabel})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isPdfView && resolvedPdfUrl && (
              <>
                <a
                  href={resolvedPdfUrl}
                  download={downloadName}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-brand-primary-fg hover:opacity-90 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh Dokumen PDF</span>
                </a>
                <a
                  href={resolvedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-brand-primary hover:text-brand-primary whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Tab Baru</span>
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pembaca materi"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isPdfView && resolvedPdfUrl ? (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <object
                data={resolvedPdfUrl}
                type="application/pdf"
                aria-label={material.title}
                className="w-full h-[70vh] min-h-[420px] bg-white"
              >
                <div className="flex h-[420px] flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
                  <FileText className="h-10 w-10 text-brand-primary" />
                  <div className="max-w-md space-y-1">
                    <p className="text-sm font-bold text-slate-900">{material.title}</p>
                    <p className="text-xs text-slate-600">
                      Pratinjau PDF tertanam tidak aktif di lingkungan browser ini. Gunakan tombol di bawah untuk mengunduh atau membuka dokumen PDF di tab baru.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <a
                      href={resolvedPdfUrl}
                      download={downloadName}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-brand-primary-fg hover:opacity-90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh Dokumen PDF</span>
                    </a>
                    <a
                      href={resolvedPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-brand-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Buka di Tab Baru</span>
                    </a>
                  </div>
                </div>
              </object>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-brand-primary" />
                <span className="truncate">Ringkasan: {material.summary}</span>
              </div>
              {material.pdfDataUrl ? (
                <span className="font-mono text-[11px] font-semibold text-emerald-700 shrink-0">
                  Dokumen Tersimpan Permanen (Base64 PDF)
                </span>
              ) : (
                <span className="font-mono text-[11px] text-slate-500 shrink-0">
                  Pratinjau Modul Digital
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {material.materialType === 'INTERACTIVE_LKPD' ? (
                <BookOpen className="h-4 w-4 text-brand-primary" />
              ) : (
                <Newspaper className="h-4 w-4 text-brand-primary" />
              )}
              <span>Teks Materi Pembelajaran</span>
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-800">
              {material.contentMarkdown}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

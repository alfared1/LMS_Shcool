import type { LearningMaterial } from '../types/lms';

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca berkas sebagai Data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Terjadi kesalahan saat membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 Data URL (`data:application/pdf;base64,...`) into a fresh
 * browser Blob URL so <iframe>, <embed>, download, and "Open in New Tab"
 * work reliably across all 5 roles and route switches without Chromium blocking data: URLs.
 */
export function dataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl || typeof window === 'undefined') return dataUrl;
  if (!dataUrl.startsWith('data:')) return dataUrl;

  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const header = dataUrl.slice(5, commaIdx);
    const payload = dataUrl.slice(commaIdx + 1);
    const mimeType = header.split(';')[0] || 'application/pdf';
    const isBase64 = header.includes(';base64');

    let bytes: Uint8Array;
    if (isBase64) {
      const binaryStr = window.atob(payload);
      bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i += 1) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
    } else {
      const decoded = decodeURIComponent(payload);
      bytes = new TextEncoder().encode(decoded);
    }

    if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
      return URL.createObjectURL(blob);
    }
  } catch {
    return dataUrl;
  }
  return dataUrl;
}

function sanitizePdfAscii(text: string): string {
  return text
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLines(text: string, maxChars = 78): string[] {
  const rawLines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length > maxChars) {
        if (current) out.push(current);
        current = w;
      } else {
        current = (current + ' ' + w).trim();
      }
    }
    if (current) out.push(current);
  }
  return out.slice(0, 34);
}

/**
 * Generates a valid single-page PDF binary Blob URL on the client so seeded
 * entries always open cleanly inside Built-in PDF Viewer <iframe>
 * and support real .pdf downloads & new-tab previews.
 */
export function buildGeneratedPdfBlobUrl(params: {
  title: string;
  subjectName: string;
  authorName: string;
  level: string;
  gradeLevel: number;
  summary: string;
  contentMarkdown: string;
}): string {
  const lines = [
    sanitizePdfAscii(params.title.toUpperCase()),
    sanitizePdfAscii(`${params.subjectName} | ${params.level} Kelas ${params.gradeLevel} | Penulis: ${params.authorName}`),
    '----------------------------------------------------------------------------',
    ...wrapLines(sanitizePdfAscii(params.summary)),
    '',
    ...wrapLines(sanitizePdfAscii(params.contentMarkdown.replace(/[#*`]/g, ''))),
  ];

  const textOps: string[] = ['BT', '/F1 13 Tf', '50 760 Td'];
  lines.forEach((line, idx) => {
    if (idx === 1) {
      textOps.push('/F1 10 Tf', '0 -20 Td');
    } else if (idx > 1) {
      textOps.push('/F1 10 Tf', '0 -16 Td');
    }
    textOps.push(`(${line}) Tj`);
  });
  textOps.push('ET');
  const streamContent = textOps.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([pdf], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }
  return `data:application/pdf;charset=utf-8,${encodeURIComponent(pdf)}`;
}

/**
 * Resolves a persistent, cross-role playable PDF URL.
 * Prefers stored Base64 Data URL converted to a fresh Blob URL, then runtime objectUrl,
 * and falls back to a valid generated PDF for seeded curriculum materials.
 */
export function resolveMaterialPdfUrl(mat: LearningMaterial): string {
  if (mat.pdfDataUrl) {
    return dataUrlToBlobUrl(mat.pdfDataUrl);
  }
  if (mat.pdfObjectUrl && !mat.pdfObjectUrl.startsWith('blob:')) {
    return mat.pdfObjectUrl;
  }
  return buildGeneratedPdfBlobUrl({
    title: mat.title,
    subjectName: mat.subjectName,
    authorName: mat.authorName,
    level: mat.level,
    gradeLevel: mat.gradeLevel,
    summary: mat.summary,
    contentMarkdown: mat.contentMarkdown || mat.summary,
  });
}

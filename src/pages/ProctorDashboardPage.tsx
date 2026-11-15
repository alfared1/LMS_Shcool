import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  LockOpen,
  Plus,
  Radar,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type { AuditLogDTO, ExamAttemptDTO, LearningMaterial } from '../types/lms';
import { formatCountdown } from '../lib/core-logic';
import {
  clearLiveCbtSyncEntry,
  mergeAttemptWithLiveSync,
  readLocalAttemptsMap,
} from '../lib/cbt-sync';
import { generateExamToken6 } from '../lib/cbt-bank-parser';
import { useTenantAndDemo } from '../context/TenantAndDemoContext';
import { SEED_MATERIALS } from '../lib/seed-data';
import { PdfMaterialViewerModal } from '../components/materials/PdfMaterialViewerModal';

interface ProctorPacketOption {
  id: string;
  title: string;
  examType: string;
  subjectName: string;
  gradeLevel: number;
  dynamicToken: string;
  questionCount: number;
}

const ROOM_SCHEDULES = [
  { room: 'Lab Komputer 01', subject: 'UAS Informatika', classGroup: 'X-IPA-1', time: '07:30 - 09:00 WIB', proctor: 'Ibu Rina, S.Pd', status: 'Berlangsung' },
  { room: 'Lab Komputer 02', subject: 'UAS Matematika Lanjut', classGroup: 'XI-IPA-2', time: '09:30 - 11:00 WIB', proctor: 'Bpk. Fajar, S.Kom', status: 'Persiapan Token' },
  { room: 'Ruang IFP Smartboard 03', subject: 'Simulasi Bahasa Arab', classGroup: 'XI-AGM-1', time: '11:30 - 12:30 WIB', proctor: 'Ustadz Farhan', status: 'Terjadwal' },
];

export function ProctorDashboardPage() {
  const { customExamPackets, updateLocalExamPacketToken, uploadedMaterials, roleProfile } =
    useTenantAndDemo();
  const [opsTab, setOpsTab] = useState<'cbt' | 'schedule' | 'materials'>('cbt');
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [serverPackets, setServerPackets] = useState<ProctorPacketOption[]>([]);
  const [examId, setExamId] = useState('uas-informatika-2026');
  const [examTitle, setExamTitle] = useState('Ujian Akhir Semester (UAS) Ganjil - Informatika');
  const [dynamicToken, setDynamicToken] = useState('UJIAN26');
  const [tokenCountdown, setTokenCountdown] = useState(900);
  const [attempts, setAttempts] = useState<ExamAttemptDTO[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDTO[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED' | 'DONE'>('ALL');
  const [serverMaterials, setServerMaterials] = useState<LearningMaterial[]>(SEED_MATERIALS);
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const mergedPackets = useMemo(() => {
    const map = new Map<string, ProctorPacketOption>();
    for (const p of customExamPackets) {
      map.set(p.id, {
        id: p.id,
        title: p.title,
        examType: p.examType,
        subjectName: p.subjectName,
        gradeLevel: p.gradeLevel,
        dynamicToken: p.dynamicToken,
        questionCount: p.questions.length,
      });
    }
    for (const s of serverPackets) {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      } else {
        const existing = map.get(s.id)!;
        map.set(s.id, {
          ...s,
          ...existing,
          dynamicToken: existing.dynamicToken || s.dynamicToken,
        });
      }
    }
    return Array.from(map.values());
  }, [customExamPackets, serverPackets]);

  const loadData = useCallback(async () => {
    try {
      const targetQuery = selectedExamId ? `?examId=${encodeURIComponent(selectedExamId)}` : '';
      const [proctorRes, auditRes, matRes] = await Promise.all([
        fetch(`/api/proctor/overview${targetQuery}`),
        fetch('/api/audit-logs'),
        fetch('/api/materials'),
      ]);
      if (proctorRes.ok) {
        const data = await proctorRes.json();
        const packetsList = Array.isArray(data.packets)
          ? (data.packets as ProctorPacketOption[])
          : [];
        if (packetsList.length > 0) setServerPackets(packetsList);

        const activeLocal = customExamPackets.find((p) => p.id === selectedExamId);
        if (activeLocal && data.examId !== selectedExamId) {
          setExamId(activeLocal.id);
          setExamTitle(activeLocal.title);
          setDynamicToken(activeLocal.dynamicToken);
        } else {
          setExamId(data.examId);
          setExamTitle(data.examTitle);
          setDynamicToken(data.dynamicToken);
          if (!selectedExamId && data.examId) {
            setSelectedExamId(data.examId);
          }
        }

        const serverAttempts = ((data.attempts || []) as ExamAttemptDTO[]).map(mergeAttemptWithLiveSync);
        const localAttemptValues = Object.values(readLocalAttemptsMap())
          .filter((a) => !selectedExamId || a.examPacketId === selectedExamId)
          .map(mergeAttemptWithLiveSync);
        const combined = [...serverAttempts];
        for (const la of localAttemptValues) {
          if (!combined.some((sa) => sa.id === la.id)) {
            combined.unshift(la);
          }
        }
        setAttempts(combined);
      }
      if (auditRes.ok) {
        setAuditLogs(await auditRes.json());
      }
      if (matRes.ok) {
        const mData = await matRes.json();
        if (Array.isArray(mData) && mData.length > 0) setServerMaterials(mData);
      }
    } catch {
      // ignore network glitches
    }
  }, [selectedExamId, customExamPackets]);

  useEffect(() => {
    loadData();
    const poll = window.setInterval(loadData, 5000);
    const onLiveSync = () => {
      setAttempts((prev) => prev.map(mergeAttemptWithLiveSync));
    };
    window.addEventListener('storage', onLiveSync);
    window.addEventListener('cendekia-cbt-sync', onLiveSync);
    window.addEventListener('cendekia-cbt-packets-sync', loadData);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('storage', onLiveSync);
      window.removeEventListener('cendekia-cbt-sync', onLiveSync);
      window.removeEventListener('cendekia-cbt-packets-sync', loadData);
    };
  }, [loadData]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setTokenCountdown((s) => (s <= 1 ? 900 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const handleSelectPacket = (nextId: string) => {
    setSelectedExamId(nextId);
    const found = mergedPackets.find((p) => p.id === nextId);
    if (found) {
      setExamId(found.id);
      setExamTitle(found.title);
      setDynamicToken(found.dynamicToken);
    }
  };

  const handleRotateToken = async () => {
    try {
      const res = await fetch('/api/proctor/rotate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, actorName: roleProfile.personName || 'Ibu Rina, S.Pd' }),
      });
      if (res.ok) {
        const data = await res.json();
        setDynamicToken(data.dynamicToken);
        updateLocalExamPacketToken(examId, data.dynamicToken);
        setTokenCountdown(900);
        showToast(`Token ruang ujian diperbarui menjadi ${data.dynamicToken}`);
        loadData();
        return;
      }
    } catch {
      // fallback local rotation if packet is local-only
    }
    const nextToken = generateExamToken6(examTitle);
    setDynamicToken(nextToken);
    updateLocalExamPacketToken(examId, nextToken);
    setTokenCountdown(900);
    showToast(`Token ruang ujian diperbarui menjadi ${nextToken}`);
  };

  const handleAction = async (
    attemptId: string,
    studentName: string,
    action: 'UNLOCK_SESSION' | 'RESET_DEVICE' | 'ADD_TIME_10M'
  ) => {
    if (action === 'UNLOCK_SESSION') {
      clearLiveCbtSyncEntry(attemptId);
    }
    const res = await fetch(`/api/proctor/attempts/${attemptId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, actorName: 'Ibu Rina, S.Pd' }),
    });
    if (res.ok) {
      const updated = (await res.json()) as ExamAttemptDTO;
      setAttempts((prev) => prev.map((a) => (a.id === attemptId ? updated : a)));
      const msg =
        action === 'UNLOCK_SESSION'
          ? `Sesi ujian ${studentName} dibuka kuncinya & pelanggaran direset ke 0.`
          : action === 'RESET_DEVICE'
          ? `Login perangkat ${studentName} berhasil direset.`
          : `Waktu ujian ${studentName} ditambah +10 menit.`;
      showToast(msg);
      loadData();
    }
  };

  const counts = {
    all: attempts.length,
    active: attempts.filter((a) => !a.submittedAt && !a.isLockedByProctor).length,
    locked: attempts.filter((a) => a.isLockedByProctor).length,
    done: attempts.filter((a) => Boolean(a.submittedAt)).length,
  };

  const filteredAttempts = attempts.filter((a) => {
    if (filter === 'ACTIVE') return !a.submittedAt && !a.isLockedByProctor;
    if (filter === 'LOCKED') return a.isLockedByProctor;
    if (filter === 'DONE') return Boolean(a.submittedAt);
    return true;
  });

  const allMaterials = useMemo(() => {
    const map = new Map<string, LearningMaterial>();
    for (const m of uploadedMaterials) map.set(m.slug, m);
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

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6">
      {/* Dynamic Token Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold text-brand-primary">PUSAT KOMANDO PENGAWAS CBT</p>
            <h1 className="text-2xl font-extrabold text-slate-900">{examTitle}</h1>
            <p className="text-xs text-slate-500">
              Pengawas Ruang: {roleProfile.personName} · Pemantauan pelanggaran tab & paket ujian aktif ({mergedPackets.length} paket)
            </p>
            {mergedPackets.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <label htmlFor="proctor-packet-select" className="text-xs font-semibold text-slate-700">
                  Pilih Paket Ujian:
                </label>
                <select
                  id="proctor-packet-select"
                  value={examId}
                  onChange={(e) => handleSelectPacket(e.target.value)}
                  className="max-w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                >
                  {mergedPackets.map((pkt) => (
                    <option key={pkt.id} value={pkt.id}>
                      {pkt.title} ({pkt.examType} · Token: {pkt.dynamicToken})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500">
                TOKEN RUANG AKTIF (Rotasi {formatCountdown(tokenCountdown)})
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-900 tabular-nums">
                {dynamicToken}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRotateToken}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-semibold text-brand-primary-fg hover:opacity-90 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Generate Token Baru</span>
            </button>
          </div>
        </div>

        {mergedPackets.length > 1 && (
          <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
            {mergedPackets.map((pkt) => {
              const active = pkt.id === examId;
              return (
                <button
                  key={pkt.id}
                  type="button"
                  onClick={() => handleSelectPacket(pkt.id)}
                  className={`rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? 'border-brand-primary bg-brand-primary/10 font-bold text-slate-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{pkt.examType} · {pkt.subjectName}</span>
                  <span className="ml-2 font-mono font-bold text-brand-primary">[{pkt.dynamicToken}]</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setOpsTab('cbt')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
              opsTab === 'cbt' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Radar className="h-3.5 w-3.5" />
            <span>Monitoring & Kontrol CBT</span>
          </button>
          <button
            type="button"
            onClick={() => setOpsTab('schedule')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
              opsTab === 'schedule' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Jadwal Ruang Kelas</span>
          </button>
          <button
            type="button"
            onClick={() => setOpsTab('materials')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold whitespace-nowrap ${
              opsTab === 'materials' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>📚 Perpustakaan Materi (PDF)</span>
          </button>
        </div>
      </div>

      {opsTab === 'materials' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Verifikasi Bahan Ajar Kelas & Perpustakaan Materi (PDF)
              </h2>
              <p className="text-xs text-slate-500">
                Tim Operasional dapat memeriksa distribusi modul PDF yang telah diunggah Guru untuk kesiapan pembelajaran kelas.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-brand-primary">
              Total Dokumen: {allMaterials.length}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {allMaterials.map((mat) => (
              <article
                key={mat.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-brand-primary">
                    <span>
                      {mat.subjectName} · {mat.level} Kelas {mat.gradeLevel}
                    </span>
                    <span className="font-mono text-slate-500">
                      {mat.fileSizeLabel || mat.materialType}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-brand-primary" />
                    <span>{mat.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{mat.summary}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3">
                  <span className="text-[11px] text-slate-500">
                    Pengunggah: <strong className="text-slate-700">{mat.authorName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewMaterial(mat)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-brand-primary-fg hover:opacity-90"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Buka & Verifikasi PDF</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {opsTab === 'schedule' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Jadwal Ruang Kelas & Laboratorium Komputer</h2>
            <p className="text-xs text-slate-500">Koordinasi ruang ujian CBT dan sesi pembelajaran interaktif IFP hari ini.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pr-4">Ruangan</th>
                  <th className="py-3 px-3">Agenda / Ujian</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Pengawas</th>
                  <th className="py-3 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ROOM_SCHEDULES.map((r) => (
                  <tr key={r.room} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-900">{r.room}</td>
                    <td className="py-3 px-3 text-slate-700">{r.subject}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">{r.classGroup}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">{r.time}</td>
                    <td className="py-3 px-3 text-xs text-slate-700">{r.proctor}</td>
                    <td className="py-3 pl-3 text-right font-semibold text-xs text-brand-primary">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {opsTab === 'cbt' && (
        <>
          {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: 'ALL', label: `Semua (${counts.all})` },
            { id: 'ACTIVE', label: `Sedang Mengerjakan (${counts.active})` },
            { id: 'LOCKED', label: `Terkunci / Pelanggaran (${counts.locked})` },
            { id: 'DONE', label: `Selesai (${counts.done})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Segarkan Status</span>
        </button>
      </div>

      {/* Student Monitoring Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredAttempts.map((att) => {
          const remainingMin = Math.max(
            0,
            Math.round((new Date(att.expiresAt).getTime() - Date.now()) / 60000)
          );
          const statusLabel = att.submittedAt
            ? `Selesai (Nilai: ${att.finalScore ?? '-'})`
            : att.isLockedByProctor
            ? 'TERKUNCI OTOMATIS'
            : 'Sedang Mengerjakan';

          return (
            <article
              key={att.id}
              className={`rounded-2xl border bg-white p-5 space-y-4 ${
                att.isLockedByProctor ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{att.studentName}</h2>
                  <p className="font-mono text-xs text-slate-500">
                    NISN {att.studentNisn} · {att.classroomName}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    att.isLockedByProctor
                      ? 'bg-red-100 text-red-800'
                      : att.submittedAt
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {att.isLockedByProctor ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : att.submittedAt ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  <span>{statusLabel}</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <div>
                  <span className="block text-slate-500">Pelanggaran</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      att.violationCount > 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {att.violationCount}/{att.maxTabSwitches}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Sisa Waktu</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {att.submittedAt ? '0 mnt' : `${remainingMin} mnt`}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500">Reset Perangkat</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {att.deviceResetCount}x
                  </span>
                </div>
              </div>

              {att.violationLogs.length > 0 && (
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Catatan Terakhir:</p>
                  <p className="mt-0.5 truncate">
                    {att.violationLogs[att.violationLogs.length - 1].detail}
                  </p>
                </div>
              )}

              {!att.submittedAt && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {(att.isLockedByProctor || att.violationCount > 0) && (
                    <button
                      type="button"
                      onClick={() => handleAction(att.id, att.studentName, 'UNLOCK_SESSION')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <LockOpen className="h-3.5 w-3.5" />
                      <span>Unlock / Reset Sesi</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAction(att.id, att.studentName, 'RESET_DEVICE')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset Login Perangkat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(att.id, att.studentName, 'ADD_TIME_10M')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Waktu (+10m)</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Immutable Security Audit Trail */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">Jejak Audit Keamanan (Immutable AuditLog)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4">Waktu</th>
                <th className="py-2.5 pr-4">Aktor</th>
                <th className="py-2.5 pr-4">Aksi</th>
                <th className="py-2.5 pr-4">Target</th>
                <th className="py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 8).map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString('id-ID')}
                  </td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-800">{log.actorName}</td>
                  <td className="py-2.5 pr-4 font-mono text-brand-primary">{log.action}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{log.targetInfo}</td>
                  <td className="py-2.5 text-slate-600">{log.reason || log.newValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </>
      )}

      <PdfMaterialViewerModal
        material={previewMaterial}
        onClose={() => setPreviewMaterial(null)}
      />
    </div>
  );
}

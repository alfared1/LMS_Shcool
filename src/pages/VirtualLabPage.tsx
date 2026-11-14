import { useState } from 'react';
import { Code2, FlaskConical, Play, RotateCcw } from 'lucide-react';

const PYTHON_PRESETS = [
  {
    id: 'zakat',
    label: 'Hitung Zakat Mal',
    code: `# Simulasi Perhitungan Zakat Mal 2.5%
harga_emas = 1400000
nisab = 85 * harga_emas
tabungan = 200000000

print("Batas Nisab (85g):", nisab)
if tabungan >= nisab:
    zakat = tabungan * 0.025
    print("Status: Wajib Zakat")
    print("Zakat yang harus dibayar:", zakat)
else:
    print("Status: Belum mencapai nisab")`,
  },
  {
    id: 'nilai',
    label: 'Agregasi Nilai Rapor',
    code: `# Rumus Pembobotan Kurikulum: 20% Game + 20% Tugas + 25% UTS + 35% UAS
game = 94
tugas = 90
uts = 88
uas = 92

nilai_akhir = game * 0.20 + tugas * 0.20 + uts * 0.25 + uas * 0.35
print("Nilai Akhir Rapor:", nilai_akhir)
if nilai_akhir >= 90:
    print("Predikat: A (Sangat Baik)")`,
  },
  {
    id: 'loop',
    label: 'Deret Kuadrat',
    code: `# Perulangan for range pada Python
total = 0
for i in range(1, 6):
    kuadrat = i * i
    total = total + kuadrat
    print("Angka:", i, "Kuadrat:", kuadrat)
print("Total Jumlah Kuadrat:", total)`,
  },
];

/**
 * Lightweight deterministic browser Python-subset evaluator
 * supporting variables, arithmetic, if/else, for range(), and print().
 */
function runPythonSubset(source: string): string[] {
  const lines = source.split('\n');
  const env: Record<string, number | string> = {};
  const output: string[] = [];

  const evalExpr = (exprRaw: string): number | string => {
    const expr = exprRaw.trim();
    if (
      (expr.startsWith('"') && expr.endsWith('"')) ||
      (expr.startsWith("'") && expr.endsWith("'"))
    ) {
      return expr.slice(1, -1);
    }
    const keys = Object.keys(env);
    const values = keys.map((k) => env[k]);
    const fn = new Function(...keys, `"use strict"; return (${expr});`);
    return fn(...values) as number | string;
  };

  const execBlock = (blockLines: string[]) => {
    let idx = 0;
    while (idx < blockLines.length) {
      const raw = blockLines[idx];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        idx += 1;
        continue;
      }

      const indent = raw.search(/\S/);

      if (trimmed.startsWith('for ') && trimmed.endsWith(':')) {
        const match = /^for\s+([a-zA-Z_]\w*)\s+in\s+range\(([^)]+)\):$/.exec(trimmed);
        if (!match) throw new Error(`Sintaks for tidak didukung: ${trimmed}`);
        const varName = match[1];
        const rangeArgs = match[2].split(',').map((a) => Number(evalExpr(a)));
        const start = rangeArgs.length >= 2 ? rangeArgs[0] : 0;
        const end = rangeArgs.length >= 2 ? rangeArgs[1] : rangeArgs[0];

        const body: string[] = [];
        idx += 1;
        while (idx < blockLines.length) {
          const next = blockLines[idx];
          if (next.trim() && next.search(/\S/) <= indent) break;
          body.push(next);
          idx += 1;
        }
        for (let v = start; v < end; v += 1) {
          env[varName] = v;
          execBlock(body);
        }
        continue;
      }

      if (trimmed.startsWith('if ') && trimmed.endsWith(':')) {
        const condExpr = trimmed.slice(3, -1).trim();
        const ifBody: string[] = [];
        const elseBody: string[] = [];
        idx += 1;
        while (idx < blockLines.length) {
          const next = blockLines[idx];
          if (next.trim() && next.search(/\S/) <= indent) break;
          ifBody.push(next);
          idx += 1;
        }
        if (idx < blockLines.length && blockLines[idx].trim() === 'else:') {
          idx += 1;
          while (idx < blockLines.length) {
            const next = blockLines[idx];
            if (next.trim() && next.search(/\S/) <= indent) break;
            elseBody.push(next);
            idx += 1;
          }
        }
        const truthy = Boolean(evalExpr(condExpr));
        execBlock(truthy ? ifBody : elseBody);
        continue;
      }

      if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(6, -1);
        const args: string[] = [];
        let buf = '';
        let inQuotes: string | null = null;
        for (const ch of inner) {
          if ((ch === '"' || ch === "'") && !inQuotes) inQuotes = ch;
          else if (ch === inQuotes) inQuotes = null;
          if (ch === ',' && !inQuotes) {
            args.push(buf);
            buf = '';
          } else {
            buf += ch;
          }
        }
        if (buf.trim()) args.push(buf);
        const rendered = args.map((a) => String(evalExpr(a))).join(' ');
        output.push(rendered);
        idx += 1;
        continue;
      }

      const assignMatch = /^([a-zA-Z_]\w*)\s*=\s*(.+)$/.exec(trimmed);
      if (assignMatch) {
        env[assignMatch[1]] = evalExpr(assignMatch[2]);
        idx += 1;
        continue;
      }

      throw new Error(`Baris tidak dikenali: ${trimmed}`);
    }
  };

  execBlock(lines);
  return output;
}

export function VirtualLabPage() {
  const [activeTab, setActiveTab] = useState<'python' | 'science'>('python');
  const [code, setCode] = useState(PYTHON_PRESETS[0].code);
  const [consoleLines, setConsoleLines] = useState<string[]>([
    'Klik "Jalankan Kode" untuk mengeksekusi skrip Python di sandbox peramban.',
  ]);

  // Science Lab State: pH & Ohm's Law
  const [acidVolume, setAcidVolume] = useState(30); // mL
  const [baseVolume, setBaseVolume] = useState(25); // mL
  const [voltage, setVoltage] = useState(12); // Volt
  const [resistance, setResistance] = useState(4); // Ohm

  const handleRunPython = () => {
    try {
      const out = runPythonSubset(code);
      setConsoleLines(out.length > 0 ? out : ['(Program selesai tanpa keluaran print)']);
    } catch (err) {
      setConsoleLines([`Error: ${err instanceof Error ? err.message : 'Kesalahan sintaks'}`]);
    }
  };

  // Compute simulated pH from titration difference
  const netMoles = baseVolume - acidVolume;
  const simulatedPh = Math.max(1.0, Math.min(13.5, Math.round((7 + netMoles * 0.14) * 10) / 10));
  const phStatus =
    simulatedPh < 6.5 ? 'ASAM' : simulatedPh > 7.5 ? 'BASA' : 'NETRAL';
  const phColor =
    simulatedPh < 4
      ? '#ef4444'
      : simulatedPh < 6.5
      ? '#f59e0b'
      : simulatedPh <= 7.5
      ? '#10b981'
      : simulatedPh < 10.5
      ? '#0ea5e9'
      : '#6366f1';

  const currentAmps = Math.round((voltage / Math.max(resistance, 0.5)) * 100) / 100;

  return (
    <div className="mx-auto max-w-[1360px] px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Virtual Lab & Sandbox Kode</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Lingkungan praktikum aman langsung di peramban untuk Informatika (Python) dan IPA (Kimia/Fisika).
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('python')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold ${
              activeTab === 'python' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Sandbox Python</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('science')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold ${
              activeTab === 'science' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>Simulator IPA (pH & Ohm)</span>
          </button>
        </div>
      </div>

      {activeTab === 'python' ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {PYTHON_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCode(p.code)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRunPython}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-primary-fg hover:opacity-90"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Jalankan Kode</span>
              </button>
            </div>

            <textarea
              aria-label="Editor Kode Python"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={13}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-emerald-300 focus:outline-none"
            />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-semibold text-slate-400">
                  Keluaran Konsol Sandbox
                </span>
                <button
                  type="button"
                  onClick={() => setConsoleLines([])}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Bersihkan</span>
                </button>
              </div>
              <div className="mt-4 space-y-2 font-mono text-sm">
                {consoleLines.map((line, i) => (
                  <p
                    key={`${i}-${line}`}
                    className={line.startsWith('Error:') ? 'text-rose-400' : 'text-emerald-300'}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <p className="mt-6 border-t border-slate-800 pt-3 text-xs text-slate-400">
              Eksekusi dilakukan secara terisolasi di sisi klien (browser sandbox) tanpa membebani server sekolah.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Acid-Base pH Titration Lab */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Simulator Titrasi Asam-Basa</h2>
                <p className="text-xs text-slate-500">Kimia SMA · HCl + NaOH dengan Indikator Universal</p>
              </div>
              <span
                className="rounded-lg px-3 py-1 font-mono text-sm font-bold text-white"
                style={{ backgroundColor: phColor }}
              >
                pH {simulatedPh} · {phStatus}
              </span>
            </div>

            {/* Beaker SVG Visualization */}
            <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 py-6">
              <svg viewBox="0 0 180 140" className="h-36 w-48" aria-label={`Visualisasi gelas kimia pH ${simulatedPh}`}>
                <rect x="45" y="20" width="90" height="105" rx="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="3" />
                <rect
                  x="48"
                  y={122 - Math.min(92, (acidVolume + baseVolume) * 0.8)}
                  width="84"
                  height={Math.min(92, (acidVolume + baseVolume) * 0.8)}
                  rx="4"
                  fill={phColor}
                  fillOpacity="0.82"
                />
                <text x="90" y="82" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="700" fontFamily="monospace">
                  pH {simulatedPh}
                </text>
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <label htmlFor="acid-slider">Volume Asam Klorida (HCl 0.1M)</label>
                  <span className="font-mono tabular-nums">{acidVolume} mL</span>
                </div>
                <input
                  id="acid-slider"
                  type="range"
                  min={5}
                  max={60}
                  value={acidVolume}
                  onChange={(e) => setAcidVolume(Number(e.target.value))}
                  className="mt-1.5 w-full accent-brand-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <label htmlFor="base-slider">Volume Natrium Hidroksida (NaOH 0.1M)</label>
                  <span className="font-mono tabular-nums">{baseVolume} mL</span>
                </div>
                <input
                  id="base-slider"
                  type="range"
                  min={5}
                  max={60}
                  value={baseVolume}
                  onChange={(e) => setBaseVolume(Number(e.target.value))}
                  className="mt-1.5 w-full accent-brand-secondary"
                />
              </div>
            </div>
          </section>

          {/* Ohm's Law Circuit Simulator */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Simulator Rangkaian Hukum Ohm</h2>
                <p className="text-xs text-slate-500">Fisika SMP/SMA · Hubungan V = I × R</p>
              </div>
              <span className="rounded-lg bg-slate-900 px-3 py-1 font-mono text-sm font-bold text-amber-400">
                I = {currentAmps} A
              </span>
            </div>

            <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 py-6">
              <svg viewBox="0 0 240 130" className="h-36 w-60" aria-label={`Rangkaian listrik arus ${currentAmps} Ampere`}>
                <rect x="30" y="25" width="180" height="80" rx="10" fill="none" stroke="#334155" strokeWidth="3" />
                <rect x="18" y="45" width="24" height="40" rx="4" fill="#0ea5e9" />
                <text x="30" y="69" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700">
                  {voltage}V
                </text>
                <rect x="95" y="13" width="50" height="24" rx="4" fill="#f59e0b" />
                <text x="120" y="29" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">
                  {resistance} Ω
                </text>
                <circle
                  cx="120"
                  cy="105"
                  r={Math.min(16, 6 + currentAmps * 1.2)}
                  fill="#fbbf24"
                  fillOpacity={Math.min(1, 0.25 + currentAmps * 0.12)}
                  stroke="#d97706"
                  strokeWidth="2"
                />
                <text x="120" y="82" textAnchor="middle" fill="#334155" fontSize="11" fontFamily="monospace">
                  Arus: {currentAmps} A
                </text>
              </svg>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <label htmlFor="volt-slider">Tegangan Sumber (V)</label>
                  <span className="font-mono tabular-nums">{voltage} Volt</span>
                </div>
                <input
                  id="volt-slider"
                  type="range"
                  min={1}
                  max={24}
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  className="mt-1.5 w-full accent-brand-primary"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <label htmlFor="ohm-slider">Hambatan Resistor (R)</label>
                  <span className="font-mono tabular-nums">{resistance} Ohm (Ω)</span>
                </div>
                <input
                  id="ohm-slider"
                  type="range"
                  min={1}
                  max={20}
                  value={resistance}
                  onChange={(e) => setResistance(Number(e.target.value))}
                  className="mt-1.5 w-full accent-brand-accent"
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Lock, RotateCcw, ShieldAlert, ShieldCheck, Terminal } from 'lucide-react';
import { GameContainerShell } from './GameContainerShell';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';
import { checkPasswordEntropy, validateVaultPassword } from '../../lib/core-logic';
import { playTone } from '../../lib/sound-fx';

interface PhishingCase {
  id: string;
  sender: string;
  url: string;
  snippet: string;
  isPhishing: boolean;
  reason: string;
}

interface RoleplayConfig {
  subtitle: string;
  phishingCases: PhishingCase[];
}

interface Props {
  title: string;
  subjectName: string;
  config: RoleplayConfig;
  autostart: boolean;
  onComplete: (score: number, durationSeconds: number) => void;
}

export function RoleplayLkpdEngine({ title, subjectName, config, autostart, onComplete }: Props) {
  const { isMuted } = useTenantAndDemo();
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Stage 1: Entropy Analyzer
  const [testPassword, setTestPassword] = useState('sekolah123');
  const entropy = checkPasswordEntropy(testPassword);

  // Stage 2: Phishing Inspector
  const [phishingIdx, setPhishingIdx] = useState(0);
  const [phishingFeedback, setPhishingFeedback] = useState<string | null>(null);
  const [phishingCorrect, setPhishingCorrect] = useState(0);

  // Stage 3: Regex Vault Creator
  const [vaultPassword, setVaultPassword] = useState('');
  const vaultResult = validateVaultPassword(vaultPassword);

  const cases = config.phishingCases || [];
  const currentCase = cases[phishingIdx];

  useEffect(() => {
    document.body.dataset.state = gameState;
    return () => {
      delete document.body.dataset.state;
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setStage(1);
    setScore(0);
    setElapsed(0);
    setTestPassword('sekolah123');
    setPhishingIdx(0);
    setPhishingFeedback(null);
    setPhishingCorrect(0);
    setVaultPassword('');
    setGameState('playing');
    playTone('click', isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [gameState]);

  const completeStage1 = () => {
    if (entropy.score < 60) return;
    playTone('correct', isMuted);
    setScore((s) => s + 30);
    setStage(2);
  };

  const handlePhishingVote = (userSaysPhishing: boolean) => {
    if (!currentCase) return;
    const ok = currentCase.isPhishing === userSaysPhishing;
    if (ok) {
      playTone('correct', isMuted);
      setPhishingCorrect((c) => c + 1);
      setScore((s) => s + 15);
      setPhishingFeedback(`Analisis Tepat: ${currentCase.reason}`);
    } else {
      playTone('wrong', isMuted);
      setPhishingFeedback(`Perlu Teliti: ${currentCase.reason}`);
    }

    window.setTimeout(() => {
      setPhishingFeedback(null);
      if (phishingIdx + 1 >= cases.length) {
        setStage(3);
      } else {
        setPhishingIdx((i) => i + 1);
      }
    }, 1100);
  };

  const completeStage3 = () => {
    if (!vaultResult.isValid) return;
    const finalScore = score + 25;
    setScore(finalScore);
    playTone('victory', isMuted);
    setGameState('gameover');
    onComplete(finalScore, elapsed);
  };

  return (
    <GameContainerShell
      title={title}
      subjectName={subjectName}
      score={score}
      timerText={gameState === 'playing' ? `${elapsed}s` : undefined}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6">
        {gameState === 'title' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <div className="flex items-center gap-2 text-emerald-400">
              <Terminal className="h-5 w-5" />
              <span className="text-xs font-semibold">LKPD KEAMANAN DIGITAL · 3 MISI</span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold text-white">{title}</h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">{config.subtitle}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 text-left">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold text-amber-400">Misi 1</p>
                <p className="mt-1 text-sm font-semibold text-white">Uji Entropi Sandi</p>
                <p className="mt-1 text-xs text-slate-400">Bandingkan sandi lemah vs sandi kuat (min 60%).</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold text-sky-400">Misi 2</p>
                <p className="mt-1 text-sm font-semibold text-white">Inspeksi Tautan Phishing</p>
                <p className="mt-1 text-xs text-slate-400">Identifikasi domain palsu vs domain resmi sekolah.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold text-emerald-400">Misi 3</p>
                <p className="mt-1 text-sm font-semibold text-white">Brankas Kebijakan Sandi</p>
                <p className="mt-1 text-xs text-slate-400">Buat sandi sesuai standar kompleksitas keamanan.</p>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              Mulai Misi LKPD
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <span className="font-mono text-xs font-bold text-emerald-400">
                TAHAP {stage} DARI 3
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`h-2 w-10 rounded-full ${
                      step <= stage ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {stage === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Misi 1: Analisis Entropi & Ketahanan Kata Sandi
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Ubah kata sandi di bawah hingga mencapai kekuatan minimal <strong>Kuat (60%)</strong> untuk melanjutkan.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Uji Kata Sandi
                  </label>
                  <input
                    type="text"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-base text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Kekuatan Entropi:</span>
                    <span className="font-mono font-bold text-white">
                      {entropy.label} ({entropy.score}% · {entropy.entropyBits} bits)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-200 ${
                        entropy.score >= 60
                          ? 'bg-emerald-500'
                          : entropy.score >= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${entropy.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Estimasi waktu retas Brute-Force: <strong className="text-slate-200">{entropy.crackTimeEstimate}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={entropy.score < 60}
                  onClick={completeStage1}
                  className="arcade-btn rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
                >
                  Lanjut ke Misi 2
                </button>
              </div>
            )}

            {stage === 2 && currentCase && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Misi 2: Inspeksi Tautan & Pengirim Phishing ({phishingIdx + 1}/{cases.length})
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Periksa alamat pengirim dan URL dengan teliti sebelum mengambil keputusan.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-5 space-y-3">
                  <div className="text-xs">
                    <span className="text-slate-400">Pengirim: </span>
                    <span className="font-mono text-amber-300">{currentCase.sender}</span>
                  </div>
                  <div className="text-xs break-all">
                    <span className="text-slate-400">URL Tautan: </span>
                    <span className="font-mono text-sky-300 underline">{currentCase.url}</span>
                  </div>
                  <p className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 leading-relaxed">
                    {currentCase.snippet}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handlePhishingVote(false)}
                    className="arcade-btn flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-500"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Resmi & Aman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhishingVote(true)}
                    className="arcade-btn flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-rose-500"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>Tandai Phishing</span>
                  </button>
                </div>

                {phishingFeedback && (
                  <p className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                    {phishingFeedback}
                  </p>
                )}
              </div>
            )}

            {stage === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Misi 3: Kunci Brankas dengan Kebijakan Sandi Aman
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Susun sandi baru yang memenuhi seluruh 5 aturan validasi Regex di bawah ini.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Sandi Brankas Baru
                  </label>
                  <input
                    type="text"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Contoh: Cendekia#2026!"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-base text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { ok: vaultResult.checks.minLength, label: 'Minimal 10 karakter' },
                    { ok: vaultResult.checks.hasUppercase, label: 'Mengandung huruf kapital (A-Z)' },
                    { ok: vaultResult.checks.hasLowercase, label: 'Mengandung huruf kecil (a-z)' },
                    { ok: vaultResult.checks.hasNumber, label: 'Mengandung angka (0-9)' },
                    { ok: vaultResult.checks.hasSymbol, label: 'Mengandung simbol (!@#$%)' },
                  ].map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                        rule.ok
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!vaultResult.isValid}
                  onClick={completeStage3}
                  className="arcade-btn inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
                >
                  <Lock className="h-4 w-4" />
                  <span>Selesaikan Misi LKPD</span>
                </button>
              </div>
            )}
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-xs font-semibold text-emerald-400">LKPD SELESAI · REKAP TERSIMPAN</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Laporan Misi Agen Siber</h2>
            <p className="mt-3 font-mono text-3xl font-bold text-amber-400">{score} / 100 Poin</p>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-left text-xs text-slate-300 space-y-1.5">
              <p>Misi 1 (Entropi Sandi): Lulus ({entropy.entropyBits} bits)</p>
              <p>Misi 2 (Deteksi Phishing): {phishingCorrect} / {cases.length} kasus tepat</p>
              <p>Misi 3 (Kebijakan Brankas): Terverifikasi</p>
              <p>Durasi Pengerjaan: {elapsed} detik</p>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="arcade-btn mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Ulangi LKPD</span>
            </button>
          </div>
        )}
      </div>
    </GameContainerShell>
  );
}

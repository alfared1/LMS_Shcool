import { useState, useRef, useEffect } from 'react';
import { Bot, Mic, MicOff, Send, Volume2, X, MessageSquare } from 'lucide-react';
import { useTenantAndDemo } from '../../context/TenantAndDemoContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUBJECT_OPTIONS = [
  'Informatika',
  'PAI & Manasik Zakat',
  'Matematika',
  'Biologi',
  'Bahasa Arab',
  'Bahasa Inggris',
];

export function FloatingAiTutorDrawer() {
  const { config, isInCbtRoom, isInGameArena } = useTenantAndDemo();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<'SMP' | 'SMA'>('SMA');
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState<string>('Informatika');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Halo! Saya ${config.aiTutorName}. Pilih jenjang, kelas, dan mata pelajaran di atas lalu ajukan pertanyaan atau gunakan mikrofon.`,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Strict CBT Zen Lockdown & Game Immersion: hide AI Tutor during exam room and fullscreen game arena
  if (isInCbtRoom || isInGameArena) {
    return null;
  }

  const gradeOptions = level === 'SMP' ? [7, 8, 9] : [10, 11, 12];

  const handleLevelChange = (nextLevel: 'SMP' | 'SMA') => {
    setLevel(nextLevel);
    setGrade(nextLevel === 'SMP' ? 8 : 10);
  };

  const showVoiceFallbackToast = (msg: string) => {
    setVoiceToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setVoiceToast(null), 4000);
  };

  const handleVoiceMic = () => {
    try {
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

      if (!SpeechRec) {
        setInput('Jelaskan cara menghitung nisab zakat mal 85 gram emas');
        showVoiceFallbackToast('Mikrofon browser tidak tersedia di sandbox ini — contoh pertanyaan suara dimasukkan.');
        return;
      }

      interface SimpleRecognition {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      }

      const recognition = new SpeechRec() as SimpleRecognition;
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setInput(transcript);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        setInput((prev) => prev || 'Jelaskan cara menghitung nisab zakat mal 85 gram emas');
        showVoiceFallbackToast('Akses mikrofon diblokir iframe/sandbox — simulasi teks suara disiapkan.');
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
      setInput((prev) => prev || 'Jelaskan cara menghitung nisab zakat mal 85 gram emas');
      showVoiceFallbackToast('Akses mikrofon dibatasi kebijakan sandbox — gunakan input teks atau tekan Kirim.');
    }
  };

  const speakResponse = (text: string) => {
    try {
      if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*`#]/g, ''));
      utterance.lang = 'id-ID';
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech synthesis restriction in sandbox
    }
  };

  const sendMessage = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || isStreaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: textToSend };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }]);
    setInput('');
    setIsStreaming(true);

    let fullText = '';
    try {
      const res = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          level,
          grade,
          subject,
          inActiveCbtRoom: false,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        fullText = errData.message || 'Maaf, asisten tutor sedang sibuk. Silakan coba lagi.';
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: fullText } : m))
        );
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payloadStr = line.slice(6).trim();
              if (!payloadStr) continue;
              try {
                const payload = JSON.parse(payloadStr) as { chunk?: string; done?: boolean };
                if (payload.chunk) {
                  fullText += payload.chunk;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, text: fullText } : m))
                  );
                }
              } catch {
                // ignore partial SSE line
              }
            }
          }
        }
        speakResponse(fullText);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: 'Koneksi terganggu. Silakan periksa jaringan Anda.' }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="no-print print:hidden fixed bottom-4 right-4 z-50">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Buka ${config.aiTutorName}`}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-brand-primary-fg shadow-xl transition-transform hover:scale-[1.03]"
        >
          <Bot className="h-4 w-4 shrink-0" />
          <span className="sm:hidden whitespace-nowrap">Tutor AI</span>
          <span className="hidden sm:inline whitespace-nowrap">{config.aiTutorName}</span>
        </button>
      ) : (
        <div
          role="dialog"
          aria-label={config.aiTutorName}
          className="flex h-[520px] w-[360px] sm:w-[410px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-primary px-4 py-3 text-brand-primary-fg">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{config.aiTutorName}</p>
                <p className="truncate text-[11px] opacity-90">{config.schoolShortName} · Tutor Kurikulum</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setTtsEnabled((v) => !v)}
                aria-label={ttsEnabled ? 'Matikan suara bacaan tutor' : 'Aktifkan suara bacaan tutor'}
                className={`rounded-lg p-1.5 text-xs ${
                  ttsEnabled ? 'bg-white/25' : 'hover:bg-white/15'
                }`}
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup Tutor"
                className="rounded-lg p-1.5 hover:bg-white/15"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Context Filters */}
          <div className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
            <select
              aria-label="Pilih Jenjang"
              value={level}
              onChange={(e) => handleLevelChange(e.target.value as 'SMP' | 'SMA')}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
            <select
              aria-label="Pilih Kelas"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              {gradeOptions.map((g) => (
                <option key={g} value={g}>
                  Kelas {g}
                </option>
              ))}
            </select>
            <select
              aria-label="Pilih Mata Pelajaran"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Feed */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-primary text-brand-primary-fg'
                      : 'border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {msg.text || (isStreaming ? 'Menyusun penjelasan...' : '')}
                </div>
              </div>
            ))}
          </div>

          {/* Voice fallback notice */}
          {voiceToast && (
            <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              {voiceToast}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <button
              type="button"
              onClick={handleVoiceMic}
              aria-label="Bicara Sekarang (Voice Input)"
              className={`shrink-0 rounded-lg border p-2 transition-colors ${
                isListening
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Tanya ${subject} Kelas ${grade}...`}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              aria-label="Kirim pertanyaan"
              className="shrink-0 rounded-lg bg-brand-primary p-2 text-brand-primary-fg disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

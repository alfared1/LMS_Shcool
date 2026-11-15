import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import { getSchoolConfigPg } from '../db/lms-repo.ts';
import { DEFAULT_SCHOOL_CONFIG } from '../lib/seed-data.ts';

interface TutorRequestBody {
  message: string;
  level?: 'SMP' | 'SMA';
  grade?: number;
  subject?: string;
  inActiveCbtRoom?: boolean;
}

function buildCurriculumSimulatorResponse(params: {
  message: string;
  level: string;
  grade: number;
  subject: string;
  aiTutorName: string;
  schoolName: string;
}): string {
  const q = params.message.toLowerCase();
  const header = `**${params.aiTutorName} · ${params.schoolName}**\n*Konteks: ${params.level} Kelas ${params.grade} · Mata Pelajaran ${params.subject}*\n\n`;

  if (q.includes('zakat') || q.includes('nisab') || params.subject.toLowerCase().includes('pai')) {
    return (
      header +
      `Berikut langkah sistematis memahami **Zakat Mal & Nisab**:\n\n` +
      `1. **Syarat Wajib**: Harta milik penuh, mencapai **nisab (setara 85 gram emas murni)**, dan telah dimiliki selama **1 tahun penuh (haul)**.\n` +
      `2. **Rumus Perhitungan**:\n` +
      `\`\`\`text\nZakat Mal = 2,5% × Total Harta Bersih (jika Harta ≥ Nisab)\n\`\`\`\n` +
      `3. **Contoh Kasus**: Jika harga emas Rp 1.400.000/gr, maka Nisab = Rp 119.000.000. Tabungan Rp 200.000.000 sudah wajib zakat sebesar **Rp 5.000.000**.\n\n` +
      `Ingin menguji pemahamanmu? Coba mainkan **Who Wants To Be A Muzakki** di menu Katalog Game!`
    );
  }

  if (q.includes('python') || q.includes('algoritma') || q.includes('siber') || q.includes('hash') || params.subject.toLowerCase().includes('informatika')) {
    return (
      header +
      `Mari kita bedah konsep **${params.subject}** langkah demi langkah:\n\n` +
      `1. **Analisis Masalah**: Pecah alur logika menjadi *input*, *proses*, dan *output*.\n` +
      `2. **Contoh Implementasi Python**:\n` +
      `\`\`\`python\ndef cek_kelulusan(nilai, kkm=75):\n    if nilai >= kkm:\n        return "Tuntas"\n    return "Perlu Remedial"\n\nprint(cek_kelulusan(88))\n\`\`\`\n` +
      `3. **Keamanan Data**: Untuk verifikasi dokumen seperti E-Rapor, fungsi hash **SHA-256** menjamin perubahan 1 karakter pun langsung terdeteksi.\n\n` +
      `Kamu bisa langsung mencoba kode Python di atas pada menu **Virtual Lab**!`
    );
  }

  if (q.includes('sel') || q.includes('mitokondria') || q.includes('ph') || params.subject.toLowerCase().includes('biologi') || params.subject.toLowerCase().includes('kimia')) {
    return (
      header +
      `Penjelasan konsep **${params.subject} (Kelas ${params.grade})**:\n\n` +
      `1. **Konsep Inti**: Pada sel eukariotik, **Mitokondria** menghasilkan ATP melalui respirasi seluler, sedangkan **Ribosom** merangkai asam amino menjadi protein.\n` +
      `2. **Skala Asam-Basa**:\n` +
      `\`\`\`text\npH = -log[H+]  |  pH < 7 (Asam) · pH = 7 (Netral) · pH > 7 (Basa)\n\`\`\`\n` +
      `3. **Latihan Praktis**: Buka **Virtual Lab** untuk menggeser konsentrasi asam-basa secara langsung atau mainkan **Cell War Battle Arena**!`
    );
  }

  return (
    header +
    `Pertanyaan yang bagus! Untuk materi **${params.subject}** jenjang **${params.level} Kelas ${params.grade}**, berikut panduan belajarnya:\n\n` +
    `1. **Pahami Konsep Dasar**: Identifikasi kata kunci utama dari pertanyaanmu (*"${params.message}"*).\n` +
    `2. **Langkah Penyelesaian**: Hubungkan teori kurikulum dengan contoh soal kontekstual agar lebih mudah diingat.\n` +
    `3. **Latihan Terarah**: Setelah membaca ringkasan modul di **Perpustakaan Materi**, kerjakan game interaktif atau simulasi di **Virtual Lab** untuk menguatkan pemahamanmu.\n\n` +
    `Apakah ada bagian rumus atau contoh soal spesifik yang ingin kita bahas lebih dalam?`
  );
}

export async function handleAiTutorChat(req: Request, res: Response): Promise<void> {
  const body = (req.body || {}) as TutorRequestBody;
  const message = String(body.message || '').trim();

  if (!message) {
    res.status(400).json({ error: 'Pesan pertanyaan tidak boleh kosong.' });
    return;
  }

  // Strict AI Tutor Exam Lockout enforcement
  if (body.inActiveCbtRoom) {
    res.status(403).json({
      error: 'AI_TUTOR_EXAM_LOCKOUT',
      message: 'Akses Asisten AI dinonaktifkan secara otomatis selama Anda berada di Ruang Ujian CBT.',
    });
    return;
  }

  let school = DEFAULT_SCHOOL_CONFIG;
  try {
    school = await getSchoolConfigPg();
  } catch {
    school = DEFAULT_SCHOOL_CONFIG;
  }
  const level = body.level || 'SMA';
  const grade = Number(body.grade || 10);
  const subject = body.subject || 'Informatika';

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const sendChunk = (text: string, source: 'gemini' | 'simulator') => {
    res.write(`data: ${JSON.stringify({ chunk: text, source })}\n\n`);
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction =
        `Anda adalah "${school.aiTutorName}" milik "${school.schoolName}" (${school.curriculumType}). ` +
        `Jawablah pertanyaan siswa secara jelas, terstruktur, ramah, dan mendidik dalam Bahasa Indonesia ` +
        `khusus untuk jenjang ${level} Kelas ${grade} mata pelajaran ${subject}. Gunakan format Markdown yang rapi.`;

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: message,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          sendChunk(chunk.text, 'gemini');
        }
      }
      res.write('data: {"done":true}\n\n');
      res.end();
      return;
    } catch {
      // Fall back gracefully to Curriculum-Aware Streaming Simulator if key is invalid/quota exceeded
    }
  }

  const simulatedText = buildCurriculumSimulatorResponse({
    message,
    level,
    grade,
    subject,
    aiTutorName: school.aiTutorName,
    schoolName: school.schoolName,
  });

  const tokens = simulatedText.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i += 3) {
    const slice = tokens.slice(i, i + 3).join('');
    sendChunk(slice, 'simulator');
    await new Promise((r) => setTimeout(r, 18));
  }
  res.write('data: {"done":true}\n\n');
  res.end();
}

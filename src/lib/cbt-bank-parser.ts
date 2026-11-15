import type { ExamOption, ServerExamQuestion } from '../types/lms';

const VALID_OPTION_IDS = ['A', 'B', 'C', 'D', 'E'] as const;

export function generateExamToken6(subjectName = ''): string {
  const letters = subjectName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const digits = '23456789';

  if (letters.length === 3) {
    const d1 = digits[Math.floor(Math.random() * digits.length)];
    const d2 = digits[Math.floor(Math.random() * digits.length)];
    const c = alphabet[Math.floor(Math.random() * alphabet.length)];
    return `${letters}${d1}${d2}${c}`;
  }

  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function normalizeCorrectId(raw: unknown): string {
  const s = String(raw || 'A').trim().toUpperCase();
  const match = s.match(/^[A-E]/);
  return match ? match[0] : 'A';
}

function makeQuestionId(prefix = 'q'): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function splitCsvRow(line: string, delimiter: ',' | ';'): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvRecords(text: string): string[][] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (current.trim().length > 0) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) lines.push(current);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter: ',' | ';' = semiCount > commaCount ? ';' : ',';

  return lines.map((line) => splitCsvRow(line, delimiter));
}

export function parseCsvQuestions(content: string): {
  questions: ServerExamQuestion[];
  errors: string[];
} {
  const rows = parseCsvRecords(content.trim());
  if (rows.length < 2) {
    return {
      questions: [],
      errors: ['File CSV harus memiliki baris header dan minimal 1 baris soal.'],
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const findCol = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const qIdx = findCol(['question', 'questiontext', 'pertanyaan', 'soal']);
  const topicIdx = findCol(['topic', 'topik', 'kompetensi', 'bab']);
  const optAIdx = findCol(['optiona', 'opsi_a', 'opsia', 'a', 'pilihana']);
  const optBIdx = findCol(['optionb', 'opsi_b', 'opsib', 'b', 'pilihanb']);
  const optCIdx = findCol(['optionc', 'opsi_c', 'opsic', 'c', 'pilihanc']);
  const optDIdx = findCol(['optiond', 'opsi_d', 'opsid', 'd', 'pilihand']);
  const optEIdx = findCol(['optione', 'opsi_e', 'opsie', 'e', 'pilihane']);
  const keyIdx = findCol(['correctoptionid', 'correct', 'answer', 'kunci', 'kuncijawaban', 'jawaban']);
  const weightIdx = findCol(['weight', 'bobot', 'skor', 'poin']);
  const imageIdx = findCol(['imageurl', 'gambar', 'image']);

  if (qIdx === -1 || optAIdx === -1 || optBIdx === -1) {
    return {
      questions: [],
      errors: [
        'Header CSV tidak dikenali. Gunakan kolom: topic,question,optionA,optionB,optionC,optionD,optionE,correctOptionId,weight',
      ],
    };
  }

  const questions: ServerExamQuestion[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const qText = (row[qIdx] || '').trim();
    if (!qText) {
      errors.push(`Baris ${r + 1}: teks pertanyaan kosong.`);
      continue;
    }

    const rawOpts: Array<[string, number]> = [
      ['A', optAIdx],
      ['B', optBIdx],
      ['C', optCIdx],
      ['D', optDIdx],
      ['E', optEIdx],
    ];
    const options: ExamOption[] = [];
    for (const [id, idx] of rawOpts) {
      const val = idx >= 0 ? (row[idx] || '').trim() : '';
      if (val) options.push({ id, text: val });
    }

    if (options.length < 2) {
      errors.push(`Baris ${r + 1}: minimal harus ada 2 opsi jawaban (A dan B).`);
      continue;
    }

    const correctOptionId = normalizeCorrectId(keyIdx >= 0 ? row[keyIdx] : 'A');
    const weightNum = Number(weightIdx >= 0 ? row[weightIdx] : 1);
    const weight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;

    questions.push({
      id: makeQuestionId(`csv-${r}`),
      topic: topicIdx >= 0 && row[topicIdx]?.trim() ? row[topicIdx].trim() : 'Umum',
      questionText: qText,
      imageUrl: imageIdx >= 0 && row[imageIdx]?.trim() ? row[imageIdx].trim() : undefined,
      options,
      correctOptionId: options.some((o) => o.id === correctOptionId) ? correctOptionId : options[0].id,
      weight,
    });
  }

  return { questions, errors };
}

export function parseJsonQuestions(content: string): {
  questions: ServerExamQuestion[];
  errors: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { questions: [], errors: ['Format JSON tidak valid. Periksa tanda kutip dan kurung kurawal.'] };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown[] }).questions)
    ? (parsed as { questions: unknown[] }).questions
    : null;

  if (!list || list.length === 0) {
    return { questions: [], errors: ['File JSON tidak berisi array soal atau properti "questions".'] };
  }

  const questions: ServerExamQuestion[] = [];
  const errors: string[] = [];

  list.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') {
      errors.push(`Item #${idx + 1}: format objek soal tidak valid.`);
      return;
    }
    const obj = raw as Record<string, unknown>;
    const qText = String(obj.questionText ?? obj.question ?? obj.pertanyaan ?? '').trim();
    if (!qText) {
      errors.push(`Item #${idx + 1}: pertanyaan kosong.`);
      return;
    }

    let options: ExamOption[] = [];
    if (Array.isArray(obj.options)) {
      options = obj.options
        .map((o, optIdx) => {
          if (typeof o === 'string') {
            return { id: VALID_OPTION_IDS[optIdx] || String(optIdx + 1), text: o.trim() };
          }
          if (o && typeof o === 'object') {
            const rec = o as Record<string, unknown>;
            const id = normalizeCorrectId(rec.id ?? VALID_OPTION_IDS[optIdx] ?? 'A');
            const text = String(rec.text ?? rec.label ?? '').trim();
            return { id, text };
          }
          return null;
        })
        .filter((o): o is ExamOption => Boolean(o && o.text));
    } else {
      const letters = VALID_OPTION_IDS;
      for (const letter of letters) {
        const val = obj[`option${letter}`] ?? obj[`opsi${letter}`] ?? obj[`opsi_${letter.toLowerCase()}`];
        if (typeof val === 'string' && val.trim()) {
          options.push({ id: letter, text: val.trim() });
        }
      }
    }

    if (options.length < 2) {
      errors.push(`Item #${idx + 1}: minimal harus memiliki 2 opsi jawaban.`);
      return;
    }

    const correctOptionId = normalizeCorrectId(
      obj.correctOptionId ?? obj.correctId ?? obj.answer ?? obj.kunci ?? 'A'
    );
    const weightNum = Number(obj.weight ?? obj.bobot ?? 1);
    const weight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;

    questions.push({
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : makeQuestionId(`json-${idx + 1}`),
      topic: String(obj.topic ?? obj.topik ?? 'Umum').trim() || 'Umum',
      questionText: qText,
      imageUrl: typeof obj.imageUrl === 'string' && obj.imageUrl.trim() ? obj.imageUrl.trim() : undefined,
      options,
      correctOptionId: options.some((o) => o.id === correctOptionId) ? correctOptionId : options[0].id,
      weight,
    });
  });

  return { questions, errors };
}

export function parseTxtQuestions(content: string): {
  questions: ServerExamQuestion[];
  errors: string[];
} {
  const blocks = content
    .trim()
    .split(/\r?\n\s*(?:---+|\r?\n)\s*/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { questions: [], errors: ['Berkas TXT kosong.'] };
  }

  const questions: ServerExamQuestion[] = [];
  const errors: string[] = [];

  blocks.forEach((block, idx) => {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let topic = 'Umum';
    let questionParts: string[] = [];
    const options: ExamOption[] = [];
    let correctOptionId = 'A';
    let weight = 1;

    for (const line of lines) {
      const topicMatch = line.match(/^(?:TOPIK|TOPIC)\s*:\s*(.+)$/i);
      if (topicMatch) {
        topic = topicMatch[1].trim();
        continue;
      }
      const keyMatch = line.match(/^(?:KUNCI|JAWABAN|ANSWER)\s*:\s*([A-Ea-e])/i);
      if (keyMatch) {
        correctOptionId = keyMatch[1].toUpperCase();
        continue;
      }
      const weightMatch = line.match(/^(?:BOBOT|WEIGHT|SKOR)\s*:\s*(\d+(?:\.\d+)?)/i);
      if (weightMatch) {
        const w = Number(weightMatch[1]);
        if (Number.isFinite(w) && w > 0) weight = w;
        continue;
      }
      const optMatch = line.match(/^([A-Ea-e])[.)]\s+(.+)$/);
      if (optMatch) {
        options.push({ id: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
        continue;
      }
      const qMatch = line.match(/^(?:Q\d*|SOAL\s*\d*|\d+[.)])\s*:?\s*(.+)$/i);
      if (qMatch && options.length === 0 && questionParts.length === 0) {
        questionParts.push(qMatch[1].trim());
      } else if (options.length === 0) {
        questionParts.push(line.replace(/^(?:PERTANYAAN|QUESTION)\s*:\s*/i, '').trim());
      }
    }

    const questionText = questionParts.join(' ').trim();
    if (!questionText) {
      errors.push(`Blok #${idx + 1}: teks pertanyaan tidak ditemukan.`);
      return;
    }
    if (options.length < 2) {
      errors.push(`Blok #${idx + 1}: minimal harus memiliki opsi A. dan B.`);
      return;
    }

    questions.push({
      id: makeQuestionId(`txt-${idx + 1}`),
      topic,
      questionText,
      options,
      correctOptionId: options.some((o) => o.id === correctOptionId) ? correctOptionId : options[0].id,
      weight,
    });
  });

  return { questions, errors };
}

export function parseQuestionBankFile(
  content: string,
  fileName: string
): {
  questions: ServerExamQuestion[];
  errors: string[];
  format: 'csv' | 'json' | 'txt';
} {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{')) {
    return { ...parseJsonQuestions(content), format: 'json' };
  }
  if (lower.endsWith('.csv')) {
    return { ...parseCsvQuestions(content), format: 'csv' };
  }
  return { ...parseTxtQuestions(content), format: 'txt' };
}

export function buildQuestionTemplateFile(
  format: 'csv' | 'json' | 'txt',
  subjectName = 'Matematika'
): { content: string; fileName: string; mimeType: string } {
  const safeSubj = subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mapel';

  if (format === 'json') {
    const sample = [
      {
        topic: `${subjectName} - Analisis Konsep`,
        questionText: `Manakah pernyataan yang paling tepat dalam analisis konsep ${subjectName} pada kasus aplikasi nyata?`,
        options: [
          { id: 'A', text: 'Menggunakan estimasi acak tanpa memperhatikan syarat batas' },
          { id: 'B', text: 'Memverifikasi variabel diketahui, menerapkan prinsip baku, dan menguji hasil' },
          { id: 'C', text: 'Mengabaikan satuan dan konversi data awal' },
          { id: 'D', text: 'Menyimpulkan hasil sebelum melakukan perhitungan' },
          { id: 'E', text: 'Menghapus parameter kontrol utama' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        topic: `${subjectName} - Penalaran HOTS`,
        questionText: `Jika parameter input digandakan pada model ${subjectName}, langkah validasi yang benar adalah...`,
        options: [
          { id: 'A', text: 'Menguji hubungan proporsionalitas antar variabel secara sistematis' },
          { id: 'B', text: 'Mempertahankan hasil lama tanpa evaluasi ulang' },
          { id: 'C', text: 'Mengurangi ketelitian pembulatan desimal' },
          { id: 'D', text: 'Mengabaikan grafik tren data' },
          { id: 'E', text: 'Menukar sumbu koordinat tanpa skala' },
        ],
        correctOptionId: 'A',
        weight: 2,
      },
    ];
    return {
      content: JSON.stringify(sample, null, 2),
      fileName: `template_bank_soal_${safeSubj}.json`,
      mimeType: 'application/json',
    };
  }

  if (format === 'txt') {
    const content = [
      `TOPIK: ${subjectName} - Konsep Dasar`,
      `1. Manakah pendekatan sistematis paling akurat untuk menyelesaikan masalah ${subjectName}?`,
      'A. Menebak langsung tanpa membaca informasi soal',
      'B. Mengidentifikasi variabel diketahui, merumuskan model, dan memeriksa kewajaran hasil',
      'C. Mengabaikan syarat batas permasalahan',
      'D. Menggunakan data dari soal lain',
      'E. Menjawab tanpa membandingkan opsi',
      'KUNCI: B',
      'BOBOT: 2',
      '---',
      `TOPIK: ${subjectName} - Studi Kasus HOTS`,
      `2. Saat mengevaluasi dua solusi alternatif pada ${subjectName}, indikator solusi terbaik adalah...`,
      'A. Solusi yang paling panjang tulisannya',
      'B. Solusi yang tidak memiliki pembuktian logis',
      'C. Solusi yang memenuhi seluruh kendala, konsisten secara matematis/ilmiah, dan efisien',
      'D. Solusi yang mengabaikan data empiris',
      'E. Solusi yang hanya berlaku untuk satu angka acak',
      'KUNCI: C',
      'BOBOT: 2',
    ].join('\n');
    return {
      content,
      fileName: `template_bank_soal_${safeSubj}.txt`,
      mimeType: 'text/plain',
    };
  }

  const csvRows = [
    'topic,question,optionA,optionB,optionC,optionD,optionE,correctOptionId,weight',
    `"${subjectName} - Konsep Dasar","Manakah langkah awal paling tepat dalam menyelesaikan persoalan ${subjectName} berbasis konteks?","Menyalin rumus tanpa membaca kasus","Mengidentifikasi besaran diketahui, ditanyakan, dan syarat batas","Memilih angka terbesar pada soal","Mengabaikan satuan pengukur","Menentukan jawaban sebelum menghitung","B",2`,
    `"${subjectName} - Analisis HOTS","Apabila terjadi perubahan variabel bebas pada eksperimen ${subjectName}, kesimpulan paling valid diperoleh dengan cara...","Membandingkan hasil terhadap variabel kontrol secara terukur","Mengubah data pengamatan agar seragam","Menghilangkan catatan galat pengukuran","Menghentikan pengamatan di awal","Menggunakan asumsi tanpa uji ulang","A",2`,
  ];
  return {
    content: csvRows.join('\n'),
    fileName: `template_bank_soal_${safeSubj}.csv`,
    mimeType: 'text/csv',
  };
}

export function generateHotsCbtQuestions(params: {
  subjectName: string;
  level: 'SMP' | 'SMA';
  gradeLevel: number;
  topicHint?: string;
}): ServerExamQuestion[] {
  const lower = `${params.subjectName} ${params.topicHint || ''}`.toLowerCase();
  const stamp = Date.now().toString(36);

  if (lower.includes('matematika') || lower.includes('aljabar') || lower.includes('kalkulus')) {
    return [
      {
        id: `hots-mtk-${stamp}-1`,
        topic: 'Persamaan & Fungsi Kuadrat',
        questionText:
          'Sebuah lintasan bola dilempar ke atas mengikuti fungsi ketinggian h(t) = -5t² + 20t + 2 (dalam meter, t dalam detik). Pada detik ke berapakah bola mencapai tinggi maksimum dan berapa tinggi maksimumnya?',
        options: [
          { id: 'A', text: 't = 1 detik, tinggi 17 meter' },
          { id: 'B', text: 't = 2 detik, tinggi 22 meter' },
          { id: 'C', text: 't = 4 detik, tinggi 22 meter' },
          { id: 'D', text: 't = 2 detik, tinggi 42 meter' },
          { id: 'E', text: 't = 5 detik, tinggi 27 meter' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-mtk-${stamp}-2`,
        topic: 'Sistem Pertidaksamaan & Optimasi',
        questionText:
          'Panitia sekolah memproduksi dua paket modul belajar: Paket A membutuhkan 2 jam cetak dan 1 jam jilid, sedangkan Paket B membutuhkan 1 jam cetak dan 2 jam jilid. Jika mesin cetak maksimal beroperasi 16 jam dan penjilidan 14 jam, berapakah total paket maksimum (A + B) yang dapat dibuat?',
        options: [
          { id: 'A', text: '8 paket' },
          { id: 'B', text: '9 paket' },
          { id: 'C', text: '10 paket (6 Paket A + 4 Paket B)' },
          { id: 'D', text: '12 paket' },
          { id: 'E', text: '14 paket' },
        ],
        correctOptionId: 'C',
        weight: 2,
      },
      {
        id: `hots-mtk-${stamp}-3`,
        topic: 'Barisan & Eksponen',
        questionText:
          'Sebuah laboratorium kultur mengamati bakteri yang membelah diri menjadi dua setiap 30 menit. Jika pada pukul 08.00 terdapat 150 bakteri, berapa jumlah bakteri pada pukul 10.30?',
        options: [
          { id: 'A', text: '1.200 bakteri' },
          { id: 'B', text: '2.400 bakteri' },
          { id: 'C', text: '4.800 bakteri' },
          { id: 'D', text: '9.600 bakteri' },
          { id: 'E', text: '3.000 bakteri' },
        ],
        correctOptionId: 'C',
        weight: 2,
      },
      {
        id: `hots-mtk-${stamp}-4`,
        topic: 'Peluang & Kombinatorika',
        questionText:
          'Dari 6 siswa putra dan 4 siswa putri akan dipilih tim cerdas cermat berisi 3 orang dengan syarat minimal terdapat 1 siswa putri. Berapa banyak komposisi tim berbeda yang dapat dibentuk?',
        options: [
          { id: 'A', text: '80 cara' },
          { id: 'B', text: '96 cara' },
          { id: 'C', text: '100 cara' },
          { id: 'D', text: '120 cara' },
          { id: 'E', text: '60 cara' },
        ],
        correctOptionId: 'C',
        weight: 2,
      },
      {
        id: `hots-mtk-${stamp}-5`,
        topic: 'Logika & Fungsi Komposisi',
        questionText:
          'Diketahui f(x) = 3x - 4 dan g(x) = x² + 1. Jika (f ∘ g)(k) = 26 dan k > 0, berapakah nilai k yang memenuhi?',
        options: [
          { id: 'A', text: '2' },
          { id: 'B', text: '3' },
          { id: 'C', text: '4' },
          { id: 'D', text: '5' },
          { id: 'E', text: '9' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
    ];
  }

  if (lower.includes('biologi') || lower.includes('ipa')) {
    return [
      {
        id: `hots-bio-${stamp}-1`,
        topic: 'Metabolisme & Fotosintesis',
        questionText:
          'Seorang peneliti menempatkan tumbuhan air Hydrilla di bawah cahaya biru dan cahaya hijau dengan intensitas sama. Gelembung O2 jauh lebih banyak terbentuk pada cahaya biru. Faktor utama penyebab fenomena tersebut adalah...',
        options: [
          { id: 'A', text: 'Cahaya hijau mematikan enzim RuBisCO di stroma' },
          { id: 'B', text: 'Klorofil a dan b menyerap spektrum biru secara optimal dan memantulkan cahaya hijau' },
          { id: 'C', text: 'Fotolisis air hanya terjadi tanpa keberadaan foton' },
          { id: 'D', text: 'Stomata menutup total ketika terkena spektrum biru' },
          { id: 'E', text: 'Respirasi sel berhenti pada spektrum hijau' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-bio-${stamp}-2`,
        topic: 'Transpor Membran Sel',
        questionText:
          'Irisan umbi kentang direndam dalam larutan sukrosa 30% selama 45 menit, sehingga massanya menyusut dan teksturnya menjadi lembek. Mekanisme seluler yang terjadi adalah...',
        options: [
          { id: 'A', text: 'Air masuk ke vakuola sel secara endositosis hingga sel turgid' },
          { id: 'B', text: 'Air keluar dari sel secara osmosis menuju larutan hipertonis sehingga terjadi plasmolisis' },
          { id: 'C', text: 'Sukrosa masuk menembus membran tanpa protein pembawa' },
          { id: 'D', text: 'Dinding sel pecah akibat tekanan turgor berlebih (lisis)' },
          { id: 'E', text: 'Pompa Na+/K+ menghentikan seluruh difusi terfasilitasi' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-bio-${stamp}-3`,
        topic: 'Enzim & Kinetika Biokimia',
        questionText:
          'Enzim katalase hati ayam menunjukkan aktivitas optimal pada suhu 37°C dan pH 7. Ketika dipanaskan hingga 80°C lalu didinginkan kembali ke 37°C, enzim tidak lagi menghasilkan gelembung gas dengan H2O2 karena...',
        options: [
          { id: 'A', text: 'Substrat H2O2 menguap seluruhnya' },
          { id: 'B', text: 'Struktur tersier protein enzim mengalami denaturasi permanen sehingga sisi aktifnya rusak' },
          { id: 'C', text: 'Enzim berubah menjadi inhibitor kompetitif' },
          { id: 'D', text: 'Pendinginan menurunkan energi aktivasi reaksi secara drastis' },
          { id: 'E', text: 'pH larutan otomatis naik menjadi 12' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-bio-${stamp}-4`,
        topic: 'Genetika Molekuler',
        questionText:
          'Jika untai cetakan DNA (template) memiliki urutan basa nitrogen 3’-TAC GGA CTA-5’, bagaimanakah urutan kodon mRNA hasil transkripsinya?',
        options: [
          { id: 'A', text: '5’-ATG CCT GAT-3’' },
          { id: 'B', text: '5’-AUG CCU GAU-3’' },
          { id: 'C', text: '5’-UAC GGA CUA-3’' },
          { id: 'D', text: '3’-AUG CCU GAU-5’' },
          { id: 'E', text: '5’-UAG CCU GAU-3’' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-bio-${stamp}-5`,
        topic: 'Ekosistem & Daur Biogeokimia',
        questionText:
          'Penggunaan pupuk nitrat berlebih di lahan pertanian dekat danau memicu ledakan populasi alga (eutrofikasi). Mengapa kondisi ini justru menyebabkan kematian massal ikan di danau tersebut?',
        options: [
          { id: 'A', text: 'Ikan tidak mampu mencerna oksigen terlarut dari fotosintesis alga' },
          { id: 'B', text: 'Dekomposer aerobik menghabiskan oksigen terlarut saat mengurai biomassa alga yang mati di dasar danau' },
          { id: 'C', text: 'Nitrat mengubah air tawar menjadi air asin secara instan' },
          { id: 'D', text: 'Cahaya matahari memanaskan air melebihi titik didih' },
          { id: 'E', text: 'Alga memakan seluruh zooplankton herbivora' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
    ];
  }

  if (lower.includes('informatika') || lower.includes('tik') || lower.includes('komputer')) {
    return [
      {
        id: `hots-inf-${stamp}-1`,
        topic: 'Kompleksitas Algoritma',
        questionText:
          'Sebuah tabel data siswa berisi 1.048.576 baris sudah terurut menaik berdasarkan NISN. Jika sistem menggunakan Binary Search dibandingkan Linear Search, maksimal berapa kali perbandingan dilakukan oleh Binary Search?',
        options: [
          { id: 'A', text: 'Sekitar 20 kali perbandingan (log₂ 1.048.576)' },
          { id: 'B', text: 'Sekitar 524.288 kali perbandingan' },
          { id: 'C', text: 'Selalu tepat 1 kali perbandingan' },
          { id: 'D', text: 'Sekitar 1.024 kali perbandingan' },
          { id: 'E', text: '1.048.576 kali perbandingan' },
        ],
        correctOptionId: 'A',
        weight: 2,
      },
      {
        id: `hots-inf-${stamp}-2`,
        topic: 'Keamanan Siber & Kriptografi',
        questionText:
          'Mengapa kata sandi pengguna di database sekolah wajib disimpan menggunakan salted slow hashing (seperti bcrypt/Argon2) dan bukan enkripsi simetris biasa atau MD5?',
        options: [
          { id: 'A', text: 'Agar administrator bisa melihat kata sandi asli siswa kapan saja' },
          { id: 'B', text: 'Salt mencegah serangan rainbow table, sedangkan slow hashing memperlambat brute-force secara eksponensial' },
          { id: 'C', text: 'Karena bcrypt memperkecil ukuran file PDF rapor' },
          { id: 'D', text: 'Agar browser tidak perlu menggunakan protokol HTTPS' },
          { id: 'E', text: 'Karena MD5 membutuhkan koneksi internet satelit' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-inf-${stamp}-3`,
        topic: 'Struktur Data Stack & Queue',
        questionText:
          'Dalam fitur Undo (Ctrl+Z) pada editor soal dan antrean pencetakan dokumen ujian di printer sekolah, pasangan struktur data yang paling tepat digunakan berturut-turut adalah...',
        options: [
          { id: 'A', text: 'Queue (FIFO) untuk Undo dan Stack (LIFO) untuk antrean printer' },
          { id: 'B', text: 'Stack (LIFO) untuk Undo dan Queue (FIFO) untuk antrean printer' },
          { id: 'C', text: 'Binary Tree untuk keduanya' },
          { id: 'D', text: 'Hash Map tanpa urutan untuk antrean printer' },
          { id: 'E', text: 'Circular Array acak untuk fitur Undo' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-inf-${stamp}-4`,
        topic: 'Jaringan Komputer & DNS',
        questionText:
          'Ketika siswa mengetik alamat portal.cendekia.sch.id namun browser gagal terhubung dengan pesan DNS_PROBE_FINISHED_NXDOMAIN, sementara akses via IP langsung 103.45.12.8 berhasil, bagian mana yang mengalami gangguan?',
        options: [
          { id: 'A', text: 'Kabel LAN fisik di komputer siswa terputus' },
          { id: 'B', text: 'Resolusi nama domain ke alamat IP pada server DNS' },
          { id: 'C', text: 'Kartu grafis (GPU) monitor tidak mendukung HTML5' },
          { id: 'D', text: 'Baterai CMOS laptop habis' },
          { id: 'E', text: 'Harddisk server penuh 100%' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-inf-${stamp}-5`,
        topic: 'Integritas Data & Transaksi',
        questionText:
          'Saat dua pengawas hampir bersamaan memperbarui status sesi ujian dan mencatat log audit, mekanisme transaksi ACID di basis data menjamin bahwa...',
        options: [
          { id: 'A', text: 'Semua perubahan parsial dibiarkan tersimpan meski terjadi error di tengah proses' },
          { id: 'B', text: 'Seluruh rangkaian operasi berhasil secara utuh atau dibatalkan seluruhnya (rollback) demi konsistensi data' },
          { id: 'C', text: 'Data lama dihapus otomatis setiap 5 menit' },
          { id: 'D', text: 'Kunci jawaban dikirim ke browser dalam format teks biasa' },
          { id: 'E', text: 'Sistem melewati tahap otentikasi pengguna' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
    ];
  }

  if (lower.includes('pai') || lower.includes('fiqih') || lower.includes('agama')) {
    return [
      {
        id: `hots-pai-${stamp}-1`,
        topic: 'Fiqih Zakat Kontemporer',
        questionText:
          'Seorang pengusaha memiliki aset perdagangan Rp 180.000.000, piutang lancar Rp 40.000.000, dan utang jatuh tempo Rp 20.000.000 selama satu tahun penuh (haul), sedangkan nisab 85 gram emas setara Rp 119.000.000. Berapakah zakat perniagaan yang wajib dikeluarkan?',
        options: [
          { id: 'A', text: 'Rp 4.500.000' },
          { id: 'B', text: 'Rp 5.000.000 (2,5% × Rp 200.000.000)' },
          { id: 'C', text: 'Rp 5.500.000' },
          { id: 'D', text: 'Rp 6.000.000' },
          { id: 'E', text: 'Belum wajib zakat karena belum mencapai nisab' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-pai-${stamp}-2`,
        topic: 'Maqashid Syariah & Muamalah',
        questionText:
          'Dalam transaksi jual beli digital (e-commerce), penjual wajib mencantumkan spesifikasi produk, cacat barang (jika ada), dan waktu pengiriman secara transparan. Prinsip ini bertujuan menghindari gharar yang berarti...',
        options: [
          { id: 'A', text: 'Kerelaan kedua belah pihak' },
          { id: 'B', text: 'Ketidakjelasan / spekulasi yang berpotensi merugikan salah satu pihak' },
          { id: 'C', text: 'Keuntungan wajar dari jasa pengantaran' },
          { id: 'D', text: 'Pencatatan akad secara tertulis' },
          { id: 'E', text: 'Pembayaran menggunakan uang elektronik yang sah' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-pai-${stamp}-3`,
        topic: 'Integritas & Etika Digital Islami',
        questionText:
          'Bagaimana penerapan nilai Siddiq dan Amanah bagi pelajar dalam menghadapi ujian berbasis komputer (CBT)?',
        options: [
          { id: 'A', text: 'Membuka tab peramban lain ketika pengawas lengah' },
          { id: 'B', text: 'Mengerjakan ujian secara mandiri dengan jujur meski tidak diawasi langsung secara fisik' },
          { id: 'C', text: 'Membagikan tangkapan layar soal ujian ke grup pesan instan' },
          { id: 'D', text: 'Menggunakan akun teman untuk meningkatkan peringkat' },
          { id: 'E', text: 'Mengabaikan aturan tata tertib ruang ujian' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-pai-${stamp}-4`,
        topic: 'Ilmu Hadis & Verifikasi Informasi',
        questionText:
          'Konsep Tabayyun dalam menyaring informasi di media sosial sebelum menyebarkannya sangat relevan dengan literasi digital modern karena...',
        options: [
          { id: 'A', text: 'Mendorong pengguna segera meneruskan berita viral tanpa memeriksa sumber' },
          { id: 'B', text: 'Mewajibkan verifikasi kebenaran sumber, konteks, dan akurasi fakta guna mencegah fitnah serta hoaks' },
          { id: 'C', text: 'Melarang penggunaan teknologi informasi dalam pembelajaran' },
          { id: 'D', text: 'Mengutamakan kecepatan unggahan di atas validitas data' },
          { id: 'E', text: 'Menghapus kebutuhan akan referensi ilmiah yang kredibel' },
        ],
        correctOptionId: 'B',
        weight: 2,
      },
      {
        id: `hots-pai-${stamp}-5`,
        topic: 'Distribusi Zakat (8 Asnaf)',
        questionText:
          'Di sebuah daerah, lembaga amil menyalurkan dana zakat produktif berupa modal usaha dan pelatihan keterampilan bagi mustahik fakir miskin agar mandiri secara ekonomi. Kebijakan ini sejalan dengan semangat QS. At-Taubah: 60 karena...',
        options: [
          { id: 'A', text: 'Mengubah status penerima (mustahik) secara bertahap menjadi pemberi zakat (muzakki)' },
          { id: 'B', text: 'Mengalihkan hak fakir miskin untuk pembangunan fasilitas komersial swasta' },
          { id: 'C', text: 'Menunda penyaluran zakat tanpa batas waktu yang jelas' },
          { id: 'D', text: 'Menyalurkan seluruh zakat hanya kepada golongan mampu' },
          { id: 'E', text: 'Menghapus kewajiban haul pada harta perniagaan' },
        ],
        correctOptionId: 'A',
        weight: 2,
      },
    ];
  }

  // Universal contextual HOTS generator for any chosen subject, level, and grade
  const topicLabel = params.topicHint?.trim() || `Kompetensi Inti ${params.subjectName}`;
  const ctxTag = `${params.level} Kelas ${params.gradeLevel}`;
  return [
    {
      id: `hots-gen-${stamp}-1`,
      topic: `${topicLabel} · Analisis Konsep`,
      questionText: `[HOTS ${ctxTag}] Seorang siswa melakukan analisis studi kasus pada mata pelajaran ${params.subjectName} (${topicLabel}). Jika ditemukan perbedaan antara hasil pengamatan awal dan teori standar, langkah ilmiah paling tepat untuk memvalidasi temuan adalah...`,
      options: [
        { id: 'A', text: 'Menghapus data pengamatan yang berbeda agar laporan terlihat rapi' },
        { id: 'B', text: 'Memeriksa ulang variabel kontrol, ketepatan metode pengukuran, dan melakukan uji pembanding' },
        { id: 'C', text: 'Mengubah kesimpulan secara sepihak tanpa bukti empiris' },
        { id: 'D', text: 'Menggunakan asumsi umum tanpa merujuk referensi akademik' },
        { id: 'E', text: 'Menyalin laporan dari kelompok lain tanpa verifikasi' },
      ],
      correctOptionId: 'B',
      weight: 2,
    },
    {
      id: `hots-gen-${stamp}-2`,
      topic: `${topicLabel} · Evaluasi Pemecahan Masalah`,
      questionText: `Dalam menyelesaikan permasalahan kompleks ${params.subjectName} di ${ctxTag}, mengapa tahap dekomposisi masalah sebelum memilih rumus atau pendekatan utama sangat menentukan akurasi jawaban?`,
      options: [
        { id: 'A', text: 'Karena mempercepat siswa menebak opsi jawaban tanpa membaca soal' },
        { id: 'B', text: 'Karena memecah masalah menjadi bagian terukur membantu mengenali informasi relevan dan syarat batasnya' },
        { id: 'C', text: 'Karena menghilangkan kebutuhan terhadap data pendukung' },
        { id: 'D', text: 'Karena semua soal HOTS hanya memerlukan hafalan definisi singkat' },
        { id: 'E', text: 'Karena struktur masalah tidak berpengaruh terhadap hasil akhir' },
      ],
      correctOptionId: 'B',
      weight: 2,
    },
    {
      id: `hots-gen-${stamp}-3`,
      topic: `${topicLabel} · Penalaran Kritis`,
      questionText: `Dua rancangan solusi diajukan dalam proyek ${params.subjectName}: Solusi X bekerja cepat namun tidak mempertimbangkan kondisi batas, sedangkan Solusi Y memverifikasi seluruh batasan konteks nyata. Manakah evaluasi yang paling tepat?`,
      options: [
        { id: 'A', text: 'Solusi X selalu lebih unggul karena waktu pengerjaannya singkat' },
        { id: 'B', text: 'Solusi Y lebih andal dan valid karena memenuhi syarat batas serta dapat dipertanggungjawabkan secara konsep' },
        { id: 'C', text: 'Keduanya tidak dapat diuji kebenarannya dalam evaluasi akademik' },
        { id: 'D', text: 'Syarat batas hanya berlaku untuk tingkat dasar, bukan tingkat lanjut' },
        { id: 'E', text: 'Solusi Y harus ditolak karena memerlukan verifikasi data' },
      ],
      correctOptionId: 'B',
      weight: 2,
    },
    {
      id: `hots-gen-${stamp}-4`,
      topic: `${topicLabel} · Sintesis & Aplikasi`,
      questionText: `Bagaimana cara terbaik mentransfer pemahaman konsep ${topicLabel} (${params.subjectName}) ke dalam situasi kehidupan nyata atau proyek lintas disiplin?`,
      options: [
        { id: 'A', text: 'Menghafalkan istilah kunci tanpa memahami hubungan sebab-akibatnya' },
        { id: 'B', text: 'Menghubungkan prinsip inti dengan data nyata, merancang model uji, lalu mengevaluasi dampaknya' },
        { id: 'C', text: 'Memisahkan teori kelas sepenuhnya dari fenomena sehari-hari' },
        { id: 'D', text: 'Menggunakan satu contoh tunggal untuk seluruh kasus yang berbeda' },
        { id: 'E', text: 'Menghindari umpan balik dan perbaikan iteratif' },
      ],
      correctOptionId: 'B',
      weight: 2,
    },
    {
      id: `hots-gen-${stamp}-5`,
      topic: `${topicLabel} · Validasi Argumen`,
      questionText: `Sebuah grafik atau data tabel pada ujian ${params.subjectName} menunjukkan lonjakan nilai pada periode tertentu akibat intervensi variabel A. Kesimpulan mana yang memenuhi kaidah penalaran HOTS?`,
      options: [
        { id: 'A', text: 'Menyatakan variabel A pasti penyebab tunggal tanpa memeriksa variabel penyerta lainnya' },
        { id: 'B', text: 'Menganalisis korelasi serta kemungkinan faktor pengganggu sebelum menyimpulkan hubungan kausalitas' },
        { id: 'C', text: 'Mengabaikan skala sumbu pada grafik saat membaca besaran lonjakan' },
        { id: 'D', text: 'Memilih titik data ekstrem saja dan membuang tren keseluruhan' },
        { id: 'E', text: 'Menyamakan seluruh kategori data tanpa klasifikasi' },
      ],
      correctOptionId: 'B',
      weight: 2,
    },
  ];
}

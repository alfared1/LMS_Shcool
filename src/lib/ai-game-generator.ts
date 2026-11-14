import type { GameEngineType } from '../types/lms';

export type GameDifficulty = 'Mudah' | 'Sedang' | 'HOTS';

export interface AiGameGenerateRequest {
  prompt: string;
  engineType: GameEngineType;
  level: 'SMP' | 'SMA';
  gradeLevel: number;
  subjectName: string;
  difficulty: GameDifficulty;
  creatorName?: string;
}

export interface AiGeneratedGameResult {
  title: string;
  config: Record<string, unknown>;
  source: 'gemini' | 'smart-contextual-generator';
}

export interface PresetPromptChip {
  id: string;
  label: string;
  engineType: GameEngineType;
  level: 'SMP' | 'SMA';
  gradeLevel: number;
  subjectName: string;
  difficulty: GameDifficulty;
  prompt: string;
}

export const AI_STUDIO_PRESET_PROMPTS: PresetPromptChip[] = [
  {
    id: 'preset-bio-foto',
    label: 'Biologi SMA · Kuis Fotosintesis & Klorofil',
    engineType: 'MILLIONAIRE_QUIZ',
    level: 'SMA',
    gradeLevel: 11,
    subjectName: 'Biologi',
    difficulty: 'Sedang',
    prompt:
      'Buatkan 5 soal kuis bertingkat tentang reaksi terang, reaksi gelap (siklus Calvin), fungsi klorofil, dan faktor laju fotosintesis pada tumbuhan.',
  },
  {
    id: 'preset-inf-klasifikasi',
    label: 'Informatika SMP · Swipe Klasifikasi Perangkat & Siber',
    engineType: 'SWIPE_CARD',
    level: 'SMP',
    gradeLevel: 8,
    subjectName: 'Informatika',
    difficulty: 'Mudah',
    prompt:
      'Buatkan 6 kartu klasifikasi cepat untuk membedakan praktik Aman vs Berisiko dalam keamanan siber, kata sandi, dan etika internet.',
  },
  {
    id: 'preset-mtk-arena',
    label: 'Matematika SMA · Turn-Based Arena Fungsi & Logika HOTS',
    engineType: 'TURN_BASED_ARENA',
    level: 'SMA',
    gradeLevel: 10,
    subjectName: 'Matematika',
    difficulty: 'HOTS',
    prompt:
      'Buatkan 6 soal HOTS pertarungan dua kelompok tentang persamaan kuadrat, diskriminan, fungsi eksponen, dan logika pembuktian.',
  },
];

function extractTopicPhrase(prompt: string, subjectName: string): string {
  const cleaned = prompt
    .replace(/buatkanlah|buatkan|tolong|game|kuis|soal|kartu|kasus|bertingkat|klasifikasi|cepat|untuk|tentang|mengenai|siswa|kelas|\d+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length >= 6) {
    if (cleaned.length <= 46) return cleaned.replace(/[.,!?]+$/, '');
    const sliced = cleaned.slice(0, 46);
    const lastSpace = sliced.lastIndexOf(' ');
    return (lastSpace > 18 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,!?]+$/, '');
  }
  return `Konsep Inti ${subjectName}`;
}

export function buildGeneratedTitle(req: AiGameGenerateRequest): string {
  const topic = extractTopicPhrase(req.prompt, req.subjectName);
  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  switch (req.engineType) {
    case 'MILLIONAIRE_QUIZ':
      return `Misi Juara ${req.subjectName}: ${capitalizedTopic}`;
    case 'SWIPE_CARD':
      return `Klasifikasi Kilat: ${capitalizedTopic}`;
    case 'IFP_TOWER_BATTLE':
      return `Pertempuran Menara IFP: ${capitalizedTopic}`;
    case 'TURN_BASED_ARENA':
      return `Arena Duel ${req.subjectName}: ${capitalizedTopic}`;
    case 'ROLEPLAY_LKPD':
      return `Terminal LKPD: ${capitalizedTopic}`;
    default:
      return `${req.subjectName}: ${capitalizedTopic}`;
  }
}

export function generateSmartGameConfig(req: AiGameGenerateRequest): AiGeneratedGameResult {
  const lower = `${req.prompt} ${req.subjectName}`.toLowerCase();
  const title = buildGeneratedTitle(req);
  const topic = extractTopicPhrase(req.prompt, req.subjectName);
  const diffLabel =
    req.difficulty === 'HOTS' ? 'Analisis HOTS' : req.difficulty === 'Sedang' ? 'Pemahaman Konsep' : 'Dasar';

  if (req.engineType === 'MILLIONAIRE_QUIZ') {
    let questions;
    if (lower.includes('fotosintesis') || lower.includes('klorofil') || lower.includes('tumbuhan')) {
      questions = [
        {
          id: 'ai-mz-1',
          question: 'Di bagian organel sel manakah reaksi terang fotosintesis terjadi pada tumbuhan hijau?',
          options: [
            { id: 'A', text: 'Stroma di dalam kloroplas' },
            { id: 'B', text: 'Membran tilakoid / grana di dalam kloroplas' },
            { id: 'C', text: 'Matriks mitokondria' },
            { id: 'D', text: 'Dinding selulosa primer' },
          ],
          correctId: 'B',
          ustadzHint: 'Ingat tempat pigmen klorofil tersusun membentuk tumpukan koin bernama grana.',
          jamaahPoll: { A: 18, B: 70, C: 7, D: 5 },
          rewardTier: 'Level 1 · 100 Poin',
        },
        {
          id: 'ai-mz-2',
          question: 'Produk utama berenergi tinggi yang dihasilkan dari reaksi terang untuk menjalankan Siklus Calvin adalah...',
          options: [
            { id: 'A', text: 'Glukosa dan Oksigen saja' },
            { id: 'B', text: 'ATP dan NADPH' },
            { id: 'C', text: 'Asam piruvat dan NADH' },
            { id: 'D', text: 'Karbon dioksida dan Uap air' },
          ],
          correctId: 'B',
          ustadzHint: 'Dua molekul pembawa energi kimia hasil fotofosforilasi di tilakoid.',
          jamaahPoll: { A: 20, B: 68, C: 8, D: 4 },
          rewardTier: 'Level 2 · 250 Poin',
        },
        {
          id: 'ai-mz-3',
          question: 'Gas oksigen (O2) yang dilepaskan ke atmosfer selama fotosintesis berasal dari pemecahan molekul...',
          options: [
            { id: 'A', text: 'Karbon dioksida (CO2)' },
            { id: 'B', text: 'Air (H2O) melalui fotolisis' },
            { id: 'C', text: 'Glukosa (C6H12O6)' },
            { id: 'D', text: 'Asam fosfogliserat (PGA)' },
          ],
          correctId: 'B',
          ustadzHint: 'Proses fotolisis memecah molekul air menggunakan energi foton cahaya.',
          jamaahPoll: { A: 22, B: 66, C: 8, D: 4 },
          rewardTier: 'Level 3 · 500 Poin',
        },
        {
          id: 'ai-mz-4',
          question: 'Enzim kunci yang mengikat CO2 dengan RuBP pada tahap fiksasi Siklus Calvin adalah...',
          options: [
            { id: 'A', text: 'Amilase' },
            { id: 'B', text: 'RuBisCO' },
            { id: 'C', text: 'Katalase' },
            { id: 'D', text: 'ATP Sintase' },
          ],
          correctId: 'B',
          ustadzHint: 'Singkatan dari Ribulosa-1,5-bisfosfat karboksilase-oksigenase.',
          jamaahPoll: { A: 9, B: 74, C: 7, D: 10 },
          rewardTier: 'Level 4 · 1.000 Poin',
        },
        {
          id: 'ai-mz-5',
          question: 'Jika intensitas cahaya meningkat terus-menerus sementara kadar CO2 di ruang kaca sangat rendah, laju fotosintesis akan...',
          options: [
            { id: 'A', text: 'Naik tanpa batas mengikuti intensitas cahaya' },
            { id: 'B', text: 'Mendatar (jenuh) karena CO2 menjadi faktor pembatas' },
            { id: 'C', text: 'Berhenti total pada cahaya terang' },
            { id: 'D', text: 'Mengubah kloroplas menjadi mitokondria' },
          ],
          correctId: 'B',
          ustadzHint: 'Gunakan hukum faktor pembatas (Law of Limiting Factors).',
          jamaahPoll: { A: 14, B: 76, C: 6, D: 4 },
          rewardTier: 'JUARA UTAMA AI STUDIO',
        },
      ];
    } else if (lower.includes('matematika') || lower.includes('aljabar') || lower.includes('kuadrat') || lower.includes('fungsi')) {
      questions = [
        {
          id: 'ai-mtk-1',
          question: 'Jika persamaan kuadrat x² - 5x + 6 = 0 memiliki akar-akar x₁ dan x₂, berapakah nilai x₁ + x₂?',
          options: [
            { id: 'A', text: '-5' },
            { id: 'B', text: '5' },
            { id: 'C', text: '6' },
            { id: 'D', text: '-6' },
          ],
          correctId: 'B',
          ustadzHint: 'Gunakan rumus jumlah akar: x₁ + x₂ = -b/a.',
          jamaahPoll: { A: 15, B: 72, C: 9, D: 4 },
          rewardTier: 'Level 1 · 100 Poin',
        },
        {
          id: 'ai-mtk-2',
          question: 'Agar suatu persamaan kuadrat ax² + bx + c = 0 memiliki dua akar real yang berbeda, syarat nilai diskriminan D = b² - 4ac adalah...',
          options: [
            { id: 'A', text: 'D < 0' },
            { id: 'B', text: 'D > 0' },
            { id: 'C', text: 'D = 0' },
            { id: 'D', text: 'D <= 0' },
          ],
          correctId: 'B',
          ustadzHint: 'Akar real berbeda membutuhkan nilai di bawah tanda akar bernilai positif.',
          jamaahPoll: { A: 8, B: 76, C: 11, D: 5 },
          rewardTier: 'Level 2 · 250 Poin',
        },
        {
          id: 'ai-mtk-3',
          question: 'Diketahui fungsi f(x) = 2x + 3. Berapakah nilai dari f(4) - f(1)?',
          options: [
            { id: 'A', text: '4' },
            { id: 'B', text: '6' },
            { id: 'C', text: '8' },
            { id: 'D', text: '11' },
          ],
          correctId: 'B',
          ustadzHint: 'Hitung f(4) = 11 dan f(1) = 5, lalu kurangkan.',
          jamaahPoll: { A: 12, B: 71, C: 10, D: 7 },
          rewardTier: 'Level 3 · 500 Poin',
        },
        {
          id: 'ai-mtk-4',
          question: 'Sumbu simetri grafik fungsi kuadrat f(x) = 2x² - 8x + 5 terletak pada garis...',
          options: [
            { id: 'A', text: 'x = -2' },
            { id: 'B', text: 'x = 2' },
            { id: 'C', text: 'x = 4' },
            { id: 'D', text: 'x = -4' },
          ],
          correctId: 'B',
          ustadzHint: 'Rumus sumbu simetri adalah x = -b / (2a).',
          jamaahPoll: { A: 14, B: 69, C: 12, D: 5 },
          rewardTier: 'JUARA UTAMA AI STUDIO',
        },
      ];
    } else {
      questions = [
        {
          id: 'ai-gen-1',
          question: `[${diffLabel}] Manakah pernyataan paling tepat mengenai prinsip dasar ${topic} pada pelajaran ${req.subjectName} (${req.level} Kelas ${req.gradeLevel})?`,
          options: [
            { id: 'A', text: 'Hanya menghafal istilah tanpa memahami hubungan sebab-akibat' },
            { id: 'B', text: `Mengidentifikasi konsep inti ${topic} dan menerapkannya pada konteks nyata` },
            { id: 'C', text: 'Mengabaikan parameter utama dan bukti empiris' },
            { id: 'D', text: 'Menggunakan asumsi acak tanpa verifikasi data' },
          ],
          correctId: 'B',
          ustadzHint: `Fokus pada penerapan konsep utama ${topic} sesuai capaian pembelajaran ${req.subjectName}.`,
          jamaahPoll: { A: 10, B: 75, C: 8, D: 7 },
          rewardTier: 'Level 1 · 100 Poin',
        },
        {
          id: 'ai-gen-2',
          question: `Dalam studi kasus ${topic}, langkah analisis pertama yang harus dilakukan siswa sebelum menarik kesimpulan adalah...`,
          options: [
            { id: 'A', text: 'Menyalin kesimpulan tanpa memeriksa sumber' },
            { id: 'B', text: 'Mengumpulkan data, mengidentifikasi variabel, dan membandingkan fakta' },
            { id: 'C', text: 'Mengubah hasil pengamatan agar sesuai dugaan awal' },
            { id: 'D', text: 'Melewati tahap pengujian konsep' },
          ],
          correctId: 'B',
          ustadzHint: 'Metode ilmiah & berpikir kritis selalu dimulai dari observasi dan verifikasi variabel.',
          jamaahPoll: { A: 9, B: 78, C: 7, D: 6 },
          rewardTier: 'Level 2 · 300 Poin',
        },
        {
          id: 'ai-gen-3',
          question: `Apa manfaat utama menguasai materi ${topic} dalam mata pelajaran ${req.subjectName} di jenjang ${req.level} Kelas ${req.gradeLevel}?`,
          options: [
            { id: 'A', text: 'Mengurangi kebutuhan berpikir analitis' },
            { id: 'B', text: `Melatih pemecahan masalah berbasis bukti pada topik ${topic}` },
            { id: 'C', text: 'Membatasi eksplorasi proyek lintas disiplin' },
            { id: 'D', text: 'Menghindari evaluasi berbasis studi kasus' },
          ],
          correctId: 'B',
          ustadzHint: 'Kurikulum Merdeka menekankan penguasaan konsep untuk pemecahan masalah nyata.',
          jamaahPoll: { A: 11, B: 74, C: 9, D: 6 },
          rewardTier: 'Level 3 · 600 Poin',
        },
        {
          id: 'ai-gen-4',
          question: `Jika terjadi anomali pada simulasi atau eksperimen ${topic}, tindakan evaluasi yang paling akurat adalah...`,
          options: [
            { id: 'A', text: 'Menutup laporan tanpa mencantumkan catatan uji coba' },
            { id: 'B', text: 'Meninjau ulang asumsi awal, mengecek data input, dan melakukan uji banding' },
            { id: 'C', text: 'Menghapus variabel yang tidak sesuai harapan' },
            { id: 'D', text: 'Mengulang jawaban yang sama tanpa perubahan' },
          ],
          correctId: 'B',
          ustadzHint: 'Validasi silang terhadap data input adalah kunci akurasi evaluasi.',
          jamaahPoll: { A: 8, B: 79, C: 7, D: 6 },
          rewardTier: 'JUARA UTAMA AI STUDIO',
        },
      ];
    }

    return {
      title,
      source: 'smart-contextual-generator',
      config: {
        subtitle: `${req.subjectName} (${req.level} Kelas ${req.gradeLevel}) · Level ${req.difficulty} · Dihasilkan AI Studio`,
        microLearningSummary: `Fokus Pembelajaran: ${req.prompt.trim()}`,
        questions,
      },
    };
  }

  if (req.engineType === 'SWIPE_CARD') {
    const isCyber =
      lower.includes('siber') || lower.includes('aman') || lower.includes('phishing') || lower.includes('sandi');
    const cards = isCyber
      ? [
          {
            id: 'ai-sw-1',
            title: 'Mengaktifkan Autentikasi Dua Faktor (2FA)',
            relation: 'Keamanan Akun Belajar',
            answer: 'RIGHT',
            explanation: '2FA melindungi akun meskipun kata sandi utama bocor.',
          },
          {
            id: 'ai-sw-2',
            title: 'Menggunakan "12345678" di Semua Aplikasi',
            relation: 'Kebijakan Kata Sandi',
            answer: 'LEFT',
            explanation: 'Sandi lemah dan berulang sangat rentan diretas dengan brute-force.',
          },
          {
            id: 'ai-sw-3',
            title: 'Memeriksa Domain Resmi (.sch.id) Sebelum Login',
            relation: 'Verifikasi Tautan',
            answer: 'RIGHT',
            explanation: 'Selalu pastikan URL berasal dari domain resmi sekolah.',
          },
          {
            id: 'ai-sw-4',
            title: 'Membagikan Kode OTP ke Orang yang Mengaku Admin',
            relation: 'Rekayasa Sosial (Social Engineering)',
            answer: 'LEFT',
            explanation: 'Admin resmi tidak pernah meminta kode OTP pribadi.',
          },
          {
            id: 'ai-sw-5',
            title: 'Mengunci Layar Laptop Saat Meninggalkan Meja',
            relation: 'Kebiasaan Fisik Aman',
            answer: 'RIGHT',
            explanation: 'Mencegah penyalahgunaan sesi oleh pihak tidak berwenang.',
          },
          {
            id: 'ai-sw-6',
            title: 'Mengklik Tautan Hadiah dari Domain .xyz Asing',
            relation: 'Deteksi Phishing',
            answer: 'LEFT',
            explanation: 'Tautan iming-iming hadiah dengan domain mencurigakan merupakan indikasi phishing.',
          },
        ]
      : [
          {
            id: 'ai-sw-1',
            title: `Penerapan Konsep Tepat: ${topic}`,
            relation: `${req.subjectName} · Kelas ${req.gradeLevel}`,
            answer: 'RIGHT',
            explanation: `Sesuai kaidah ilmiah dan prinsip kurikulum ${req.subjectName}.`,
          },
          {
            id: 'ai-sw-2',
            title: `Miskonsepsi Umum tentang ${topic}`,
            relation: 'Perlu Koreksi Konsep',
            answer: 'LEFT',
            explanation: 'Pernyataan ini bertentangan dengan bukti empiris dan definisi baku.',
          },
          {
            id: 'ai-sw-3',
            title: `Verifikasi Data & Sumber Valid (${req.subjectName})`,
            relation: 'Praktik Ilmiah Benar',
            answer: 'RIGHT',
            explanation: 'Pembelajaran berbasis bukti menghasilkan kesimpulan yang akurat.',
          },
          {
            id: 'ai-sw-4',
            title: 'Menarik Kesimpulan Tanpa Uji Coba',
            relation: 'Bias Penilaian',
            answer: 'LEFT',
            explanation: 'Kesimpulan valid harus melewati tahap analisis dan pembuktian.',
          },
          {
            id: 'ai-sw-5',
            title: `Studi Kasus Terstruktur ${topic}`,
            relation: `Level ${req.difficulty}`,
            answer: 'RIGHT',
            explanation: 'Analisis terstruktur membantu menguasai materi secara mendalam.',
          },
        ];

    return {
      title,
      source: 'smart-contextual-generator',
      config: {
        subtitle: `Geser Kanan (Tepat / Aman) atau Kiri (Kurang Tepat / Berisiko) · ${req.subjectName}`,
        leftLabel: isCyber ? 'Berisiko' : 'Miskonsepsi',
        rightLabel: isCyber ? 'Praktik Aman' : 'Konsep Tepat',
        kitabSummary: `Ringkasan Materi (${req.subjectName} ${req.level} Kelas ${req.gradeLevel}): ${req.prompt.trim()}`,
        cards,
      },
    };
  }

  if (req.engineType === 'IFP_TOWER_BATTLE') {
    const isArabic = lower.includes('arab') || lower.includes('mudzakkar') || lower.includes('muannats');
    const prompts = isArabic
      ? [
          { arabic: 'كِتَابٌ', translit: 'Kitabun', meaning: 'Buku', category: 'MUDZAKKAR' },
          { arabic: 'مَدْرَسَةٌ', translit: 'Madrasatun', meaning: 'Sekolah', category: 'MUANNATS' },
          { arabic: 'مَكْتَبٌ', translit: 'Maktabun', meaning: 'Meja', category: 'MUDZAKKAR' },
          { arabic: 'حَقِيبَةٌ', translit: 'Haqibatun', meaning: 'Tas', category: 'MUANNATS' },
          { arabic: 'مُعَلِّمٌ', translit: 'Muallimun', meaning: 'Guru (Lk)', category: 'MUDZAKKAR' },
          { arabic: 'مُعَلِّمَةٌ', translit: 'Muallimatun', meaning: 'Guru (Pr)', category: 'MUANNATS' },
        ]
      : [
          { arabic: 'BENAR', translit: `Fakta: ${topic}`, meaning: 'Pernyataan Ilmiah Tepat', category: 'MUDZAKKAR' },
          { arabic: 'MITOS', translit: `Mitos ${req.subjectName}`, meaning: 'Perlu Diluruskan', category: 'MUANNATS' },
          { arabic: 'VALID', translit: 'Uji Bukti Empiris', meaning: 'Sesuai Kaidah', category: 'MUDZAKKAR' },
          { arabic: 'KELIRU', translit: 'Asumsi Tanpa Data', meaning: 'Tidak Terbukti', category: 'MUANNATS' },
          { arabic: 'TEPAT', translit: `Aplikasi ${topic}`, meaning: 'Konteks Nyata', category: 'MUDZAKKAR' },
          { arabic: 'SALAH', translit: 'Kontradiksi Konsep', meaning: 'Melanggar Aturan', category: 'MUANNATS' },
        ];

    return {
      title,
      source: 'smart-contextual-generator',
      config: {
        subtitle: `Arena Layar Sentuh IFP (${req.subjectName} Kelas ${req.gradeLevel}) · Mode ${req.difficulty}`,
        durationSeconds: 60,
        leftTeam: {
          name: isArabic ? 'Tim Mudzakkar' : 'Tim Fakta / Konsep Tepat',
          targetCategory: 'MUDZAKKAR',
          buttonLabel: isArabic ? 'TEMBAK (MUDZAKKAR)' : 'TEMBAK (KONSEP TEPAT)',
        },
        rightTeam: {
          name: isArabic ? 'Tim Muannats' : 'Tim Mitos / Miskonsepsi',
          targetCategory: 'MUANNATS',
          buttonLabel: isArabic ? 'TEMBAK (MUANNATS)' : 'TEMBAK (MISKONSEPSI)',
        },
        prompts,
      },
    };
  }

  if (req.engineType === 'ROLEPLAY_LKPD') {
    return {
      title,
      source: 'smart-contextual-generator',
      config: {
        subtitle: `LKPD Digital 3 Misi (${req.subjectName} · ${req.level} Kelas ${req.gradeLevel}): ${topic}`,
        phishingCases: [
          {
            id: 'ai-rp-1',
            sender: 'verifikasi@portal-hadiah-cepat.xyz',
            url: 'http://login-siswa.portal-hadiah-cepat.xyz/otp',
            snippet: `Peringatan palsu terkait ${topic}: masukkan sandi akun belajar Anda sekarang untuk menghindari pemblokiran.`,
            isPhishing: true,
            reason: 'Domain mencurigakan (.xyz), protokol HTTP tidak terenkripsi, dan meminta kredensial akun.',
          },
          {
            id: 'ai-rp-2',
            sender: 'akademik@cendekia.sch.id',
            url: 'https://portal.cendekia.sch.id/materials',
            snippet: `Materi resmi ${req.subjectName} (${topic}) telah tersedia di Perpustakaan Digital sekolah.`,
            isPhishing: false,
            reason: 'Domain resmi .sch.id dan mengarahkan ke modul pembelajaran internal tanpa meminta sandi.',
          },
          {
            id: 'ai-rp-3',
            sender: 'helpdesk@c3ndekia-update.com',
            url: 'https://reset.c3ndekia-update.com/auth',
            snippet: 'Klaim kuota belajar gratis dengan memasukkan token ujian CBT Anda di formulir eksternal ini.',
            isPhishing: true,
            reason: 'Typosquatting ("c3ndekia") dan meminta token ujian yang bersifat rahasia.',
          },
        ],
      },
    };
  }

  // TURN_BASED_ARENA
  const questions =
    lower.includes('matematika') || lower.includes('kuadrat') || lower.includes('eksponen')
      ? [
          {
            id: 'ai-ar-1',
            question: 'Diketahui persamaan kuadrat x² - 7x + 10 = 0. Manakah pasangan akar-akar persamaan tersebut?',
            options: [
              { id: 'A', text: 'x = 2 atau x = 5' },
              { id: 'B', text: 'x = -2 atau x = -5' },
              { id: 'C', text: 'x = 1 atau x = 10' },
              { id: 'D', text: 'x = 3 atau x = 4' },
            ],
            correctId: 'A',
            ihsanHint: 'Cari dua bilangan yang hasil kalinya 10 dan jumlahnya 7.',
          },
          {
            id: 'ai-ar-2',
            question: 'Jika 2^(x+1) = 32, berapakah nilai x yang memenuhi persamaan eksponen tersebut?',
            options: [
              { id: 'A', text: '3' },
              { id: 'B', text: '4' },
              { id: 'C', text: '5' },
              { id: 'D', text: '6' },
            ],
            correctId: 'B',
            ihsanHint: 'Ubah 32 menjadi 2 pangkat 5, lalu samakan pangkatnya: x + 1 = 5.',
          },
          {
            id: 'ai-ar-3',
            question: 'Nilai diskriminan dari persamaan kuadrat 2x² - 4x + 2 = 0 adalah...',
            options: [
              { id: 'A', text: '0 (memiliki akar kembar)' },
              { id: 'B', text: '16' },
              { id: 'C', text: '-16' },
              { id: 'D', text: '8' },
            ],
            correctId: 'A',
            ihsanHint: 'Hitung D = b² - 4ac = (-4)² - 4(2)(2).',
          },
          {
            id: 'ai-ar-4',
            question: 'Titik puncak (vertex) dari parabola f(x) = x² - 6x + 11 berada pada koordinat...',
            options: [
              { id: 'A', text: '(3, 2)' },
              { id: 'B', text: '(-3, 2)' },
              { id: 'C', text: '(3, 11)' },
              { id: 'D', text: '(6, 11)' },
            ],
            correctId: 'A',
            ihsanHint: 'Cari x puncak = -b/(2a) = 3, lalu substitusi x = 3 ke dalam f(x).',
          },
          {
            id: 'ai-ar-5',
            question: 'Jika suatu koloni bakteri membelah menjadi dua setiap jam dari awal 50 sel, jumlah sel setelah 4 jam adalah...',
            options: [
              { id: 'A', text: '400 sel' },
              { id: 'B', text: '800 sel' },
              { id: 'C', text: '200 sel' },
              { id: 'D', text: '1.600 sel' },
            ],
            correctId: 'B',
            ihsanHint: 'Gunakan model pertumbuhan eksponensial: 50 × 2⁴.',
          },
          {
            id: 'ai-ar-6',
            question: 'Pernyataan logika "Jika rajin berlatih maka nilai meningkat" ekuivalen (kontraposisi) dengan...',
            options: [
              { id: 'A', text: 'Jika nilai tidak meningkat maka tidak rajin berlatih' },
              { id: 'B', text: 'Jika nilai meningkat maka rajin berlatih' },
              { id: 'C', text: 'Jika tidak rajin berlatih maka nilai meningkat' },
              { id: 'D', text: 'Rajin berlatih dan nilai tidak meningkat' },
            ],
            correctId: 'A',
            ihsanHint: 'Kontraposisi dari (p → q) adalah (~q → ~p).',
          },
        ]
      : [
          {
            id: 'ai-ar-1',
            question: `[${diffLabel}] Manakah definisi dan pendekatan paling tepat untuk topik ${topic} pada mapel ${req.subjectName}?`,
            options: [
              { id: 'A', text: `Analisis terstruktur berbasis bukti pada ${topic}` },
              { id: 'B', text: 'Menebak hasil akhir tanpa langkah sistematis' },
              { id: 'C', text: 'Mengabaikan keterkaitan antar konsep' },
              { id: 'D', text: 'Menghindari verifikasi hasil' },
            ],
            correctId: 'A',
            ihsanHint: 'Pilih pendekatan yang sistematis dan dapat diuji kebenarannya.',
          },
          {
            id: 'ai-ar-2',
            question: `Pada materi ${topic} kelas ${req.gradeLevel}, strategi mana yang menghasilkan akurasi tertinggi dalam pemecahan soal?`,
            options: [
              { id: 'A', text: 'Mengidentifikasi variabel diketahui, rumus/aturan, lalu memvalidasi satuan atau logika' },
              { id: 'B', text: 'Langsung memilih angka terbesar di soal' },
              { id: 'C', text: 'Mengabaikan syarat batas permasalahan' },
              { id: 'D', text: 'Menggabungkan data tanpa konversi' },
            ],
            correctId: 'A',
            ihsanHint: 'Ketelitian mengidentifikasi kondisi awal mencegah kesalahan umum.',
          },
          {
            id: 'ai-ar-3',
            question: `Dalam diskusi kelompok ${req.subjectName}, cara terbaik menguji argumen terkait ${topic} adalah...`,
            options: [
              { id: 'A', text: 'Menyajikan data pendukung dan contoh kasus yang relevan' },
              { id: 'B', text: 'Mengulang pendapat tanpa bukti' },
              { id: 'C', text: 'Mengabaikan pertanyaan pembanding' },
              { id: 'D', text: 'Menutup ruang evaluasi sejawat' },
            ],
            correctId: 'A',
            ihsanHint: 'Argumen akademik selalu bertumpu pada bukti dan penalaran logis.',
          },
          {
            id: 'ai-ar-4',
            question: `Mengapa pemahaman konsep ${topic} penting sebelum menghadapi Evaluasi CBT ${req.subjectName}?`,
            options: [
              { id: 'A', text: 'Membantu menjawab variasi soal kontekstual & HOTS secara mandiri' },
              { id: 'B', text: 'Agar tidak perlu membaca soal dengan teliti' },
              { id: 'C', text: 'Untuk memperpendek waktu tanpa memeriksa jawaban' },
              { id: 'D', text: 'Karena soal hanya mengulang satu kalimat' },
            ],
            correctId: 'A',
            ihsanHint: 'Soal HOTS menuntut transfer konsep ke situasi baru.',
          },
        ];

  return {
    title,
    source: 'smart-contextual-generator',
    config: {
      subtitle: `Arena Duel Kelompok (${req.subjectName} · ${req.level} Kelas ${req.gradeLevel}) · ${req.difficulty}`,
      turnDurationSeconds: req.difficulty === 'HOTS' ? 25 : 20,
      teamA: { name: `Tim Alpha (${req.subjectName})`, role: 'Penyerang Konsep' },
      teamB: { name: `Tim Omega (${req.subjectName})`, role: 'Penantang Strategis' },
      questions,
    },
  };
}

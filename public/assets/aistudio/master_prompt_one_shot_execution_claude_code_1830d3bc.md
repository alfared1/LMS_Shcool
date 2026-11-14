# MASTER PROMPT: ONE-SHOT EXECUTION UNTUK CLAUDE CODE CLI
**Cara Penggunaan:**
1. Buka terminal di dalam VS Code pada folder kosong proyek Anda.
2. Pastikan dokumen `sad_cendekiaedu_lms.md` dan `ui_ux_design_system_lms.md` berada di dalam folder yang sama (atau cukup salin seluruh isi dokumen ini langsung ke dalam prompt Claude Code).
3. Jalankan perintah `claude` di terminal, lalu **Copy & Paste seluruh teks di dalam blok di bawah ini** ke Claude Code.

---

## SALIN TEKS DI BAWAH INI KE CLAUDE CODE:

Act as a Principal Full-Stack Engineer and Lead UI/UX Architect. I need you to build a complete, 100% interactive, production-grade **White-Label Enterprise Gamified LMS, High-Security CBT (UTS/UAS), & Digital E-Rapor Archival System** in Next.js (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion + Prisma ORM.

### CRITICAL CONTEXT: CLIENT PRESENTATION TOMORROW
I am presenting this system to a school client tomorrow. Therefore, the application MUST:
1. **Run 100% smoothly out-of-the-box (`npm run dev`) with ZERO broken links, ZERO empty states, and ZERO external cloud configuration blockers.**
2. Use **SQLite (`file:./dev.db`) as the default Prisma provider for instant local zero-config seeding**, while keeping the schema 100% compatible with PostgreSQL so I can switch the provider string later.
3. Include a **Floating Demo Role-Switcher & Presentation Toolbar** at the bottom-left (`Ctrl+D` to toggle) allowing me to switch roles in 1 click during the live presentation without logging in/out:
   - `👨‍🎓 Siswa (Ahmad Fauzi - X IPA 1)`
   - `👩‍🏫 Guru Mapel & Kreator Game (Ustadz Hendra, M.Pd)`
   - `🕵️ Pengawas Ruang CBT (Ibu Rina - Proctor)`
   - `⚙️ Super Admin (Live White-Label Customizer)`
4. Include **Hybrid Fallbacks** for third-party services so nothing fails during live demo:
   - **AI Tutor**: Use native browser `webkitSpeechRecognition` / `SpeechRecognition` and `speechSynthesis` for Voice Navigation & Speech-to-Text. If `GEMINI_API_KEY` is not set in `.env`, automatically use an intelligent **Curriculum-Aware Streaming Simulator** that streams step-by-step educational answers with LaTeX/code blocks based on the selected Grade (SMP/SMA, Kelas 7–12) and Subject.
   - **E-Rapor PDF & QR Code**: Render an official A4 print-ready E-Rapor (`window.print()` with `@media print` styling) featuring the dynamic School Header (`reportHeaderUrl`), Principal Signature, and a live SVG **QR Code** pointing to `/verify/[sha256Hash]` so the client can scan the screen with their smartphone during tomorrow's presentation and see the cryptographic verification page!

---

### 1. TARGET DIRECTORY & ROUTING ARCHITECTURE

Create and implement every single file in this exact structure so no route returns a 404:

```text
├── CLAUDE.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── context/
│   │   └── TenantAndDemoContext.tsx       # Manages Live White-Label Config, Active Demo Role, & Audio Mute state
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── deterministic-shuffle.ts       # Seeded PRNG (studentId + examId) for CBT questions & options
│   │   └── mock-seed-fallback.ts          # Instant in-memory fallback data if DB is being reset
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                 # Dynamic logo, schoolShortName, i18n toggle (ID/EN), Role badge
│   │   │   ├── Sidebar.tsx                # Role-adaptive menu (Auto-hidden in Game & CBT Zen mode)
│   │   │   └── DemoPresentationBar.tsx    # 1-Click Role Switcher + Quick White-Label Preset Buttons
│   │   ├── games/
│   │   │   ├── GameContainerShell.tsx     # Wrapper: Fullscreen IFP toggle, Sound SFX toggle, Score, Timer
│   │   │   ├── MillionaireQuizEngine.tsx  # "Who Wants To Be A Muzakki" with 5 Lifelines & Zakat Calculator
│   │   │   ├── IfpTowerBattleEngine.tsx   # Split-Screen 2-Team Classroom Touchscreen Battle (Bottom-half touch zone)
│   │   │   ├── SwipeCardEngine.tsx        # "Misi Mahram" Left/Right swipe with 3 hearts & combo multiplier
│   │   │   ├── RoleplayLkpdEngine.tsx     # "Terminal Agen Siber" 3-stage interactive cybersecurity mission
│   │   │   └── TurnBasedArenaEngine.tsx   # "Cell War Battle Arena" 2-Group classroom quiz with Kartu Ihsan
│   │   ├── cbt/
│   │   │   ├── ZenLockdownHeader.tsx      # Server-Authoritative Timer (tabular-nums) + Sync status
│   │   │   ├── ViolationShieldModal.tsx   # Triggers on tab switch (visibilitychange) / fullscreen exit
│   │   │   └── QuestionNavigatorGrid.tsx  # Answered (Green), Doubtful/Ragu-ragu (Amber), Unanswered (Slate)
│   │   └── ai-tutor/
│   │       └── FloatingAiTutorDrawer.tsx  # Context filter (SMP/SMA, Kelas 7-12, Mapel) + Voice Mic STT/TTS (Auto-disabled during active CBT!)
│   └── app/
│       ├── globals.css                    # CSS Variables (--brand-primary, --brand-secondary, --brand-accent)
│       ├── layout.tsx                     # RootLayout injecting TenantProvider, Navbar, FloatingAiTutor, DemoBar
│       ├── page.tsx                       # Interactive Showcase Landing Page + Live Mini-Quiz Preview + Catalog
│       ├── games/
│       │   ├── page.tsx                   # Full Gamified LKPD & Game Hub with Grade/Subject filters
│       │   └── [slug]/page.tsx            # Dynamic Game Player rendering the 5 engines via GameContainerShell
│       ├── materials/
│       │   └── page.tsx                   # Digital Library (PDF Modules, Interactive LKPD, Blog Articles)
│       ├── virtual-lab/
│       │   └── page.tsx                   # Interactive Python Code Sandbox + Science Virtual Lab Simulator
│       ├── cbt/
│       │   ├── page.tsx                   # Exam Lobby: Token 6-digit input ("UJIAN26") & SEB readiness check
│       │   └── [examId]/room/page.tsx     # High-Focus Zen Lockdown Exam Room (Anti-Cheating active)
│       ├── dashboard/
│       │   ├── student/page.tsx           # 12-Col Bento Grid: Streak, Active CBT Banner, Radar Chart, Leaderboard
│       │   ├── teacher/page.tsx           # JSON Game Builder, Material Uploader, & Automated Gradebook Ledger
│       │   ├── proctor/page.tsx           # Real-Time Proctor Command Center: Rotating 6-digit Token, Unlock Student Session, Reset Device Login, +10m Time
│       │   └── admin/white-label/page.tsx # Live White-Label Studio: Change School Name, Logo, Colors, Kop Rapor, & AI Name with 3 Instant School Presets
│       ├── erapor/
│       │   └── page.tsx                   # Automated Gradebook Aggregator + Official Printable A4 E-Rapor with QR Code
│       └── verify/
│           └── [hash]/page.tsx            # Public Cryptographic SHA-256 E-Rapor Verification Certificate Page
```

---

### 2. DATABASE SCHEMA (`prisma/schema.prisma`)

Create `prisma/schema.prisma` using SQLite for zero-config local execution (keep field structures clean so switching to PostgreSQL later is a 1-line change):

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model SchoolConfig {
  id                    String   @id @default("default_tenant")
  schoolName            String   @default("Sekolah Cendekia Nusantara")
  schoolShortName       String   @default("CendekiaEdu")
  npsn                  String   @default("20269981")
  tagline               String   @default("Platform Pembelajaran Digital, Evaluasi CBT & E-Rapor Terpadu")
  address               String   @default("Jl. Pendidikan Cendekia No. 1, Kawasan Inovasi Akademik")
  logoUrl               String   @default("/logo-placeholder.svg")
  principalName         String   @default("Dr. H. Ahmad Sulaiman, M.Pd.")
  principalNip          String   @default("19780412 200501 1 004")
  primaryColorHex       String   @default("#059669") // Emerald-600
  secondaryColorHex     String   @default("#0284c7") // Sky-600
  accentColorHex        String   @default("#d97706") // Amber-600
  aiTutorName           String   @default("Asisten Cendekia AI")
  curriculumType        String   @default("KURIKULUM_MERDEKA")
  updatedAt             DateTime @updatedAt
}

model EducationalGame {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  creatorName String
  subjectCode String
  subjectName String
  level       String   // "SMP" or "SMA"
  gradeLevel  Int
  engineType  String   // "MILLIONAIRE_QUIZ" | "IFP_TOWER_BATTLE" | "SWIPE_CARD" | "ROLEPLAY_LKPD" | "TURN_BASED_ARENA"
  playCount   Int      @default(0)
  configJson  String   // JSON string containing questions, levels, rules
  createdAt   DateTime @default(now())
}

model ExamPacket {
  id              String         @id @default(cuid())
  title           String
  examType        String         // "UTS" | "UAS" | "USBN"
  subjectName     String
  gradeLevel      Int
  durationMinutes Int            @default(60)
  dynamicToken    String         @default("UJIAN26")
  maxTabSwitches  Int            @default(3)
  questionsJson   String         // JSON array of questions (server filters out correctOptionId when sending to client)
  attempts        ExamAttempt[]
}

model ExamAttempt {
  id                String     @id @default(cuid())
  examPacketId      String
  examPacket        ExamPacket @relation(fields: [examPacketId], references: [id])
  studentName       String
  studentNisn       String
  classroomName     String
  startedAt         DateTime   @default(now())
  expiresAt         DateTime
  submittedAt       DateTime?
  answersJson       String     @default("{}")
  violationCount    Int        @default(0)
  violationLogsJson String     @default("[]")
  isLockedByProctor Boolean    @default(false)
  finalScore        Float?
}

model ReportCard {
  id                 String   @id @default(cuid())
  studentName        String
  studentNisn        String
  classroomName      String
  academicYear       String   @default("2026/2027 - Semester Ganjil")
  gradesSnapshotJson String   // JSON array of subjects: { code, name, dailyGameAvg, taskScore, utsScore, uasScore, finalGrade, predicate, teacherNote }
  sha256Hash         String   @unique
  isLocked           Boolean  @default(true)
  publishedAt        DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(cuid())
  actorName   String
  actorRole   String
  action      String
  targetInfo  String
  oldValue    String?
  newValue    String?
  reason      String?
  ipAddress   String   @default("192.168.1.104")
  createdAt   DateTime @default(now())
}
```

---

### 3. RICH REALISTIC SEED DATA (`prisma/seed.ts` & Fallback)

Populate the database (and `src/lib/mock-seed-fallback.ts`) with rich, authentic Indonesian educational content inspired by `cendekiaedu.id`:

1. **5 Fully Playable Educational Games**:
   - **Game 1 (`who-wants-to-be-a-muzakki`)**:
     - Engine: `MILLIONAIRE_QUIZ`, Creator: `pai_scb`, Subject: `PAI & Manasik Zakat`, Grade: `10`, Plays: `1420`.
     - Features: 3 Modes (Normal 60s, Cepat 10s, Marathon), 5 Lifelines (*50:50*, *2x Kesempatan*, *Tanya Jamaah*, *Tanya Ustadz*, *Freeze Timer*), integrated Zakat 2.5% Nisab Calculator, and 5 authentic Fiqih Zakat questions (e.g., Nisab emas 85 gram, kadar zakat mal 2.5%, 8 golongan Asnaf di QS. At-Taubah: 60).
   - **Game 2 (`pertempuran-menara-arab`)**:
     - Engine: `IFP_TOWER_BATTLE`, Creator: `ba_sma`, Subject: `Bahasa Arab`, Grade: `11`, Plays: `890`.
     - Features: Designed for 65-inch Classroom Interactive Flat Panel (IFP). Split-screen: **Tim Mudzakkar (Kiri - Emerald)** vs **Tim Muannats (Kanan - Sky)**. Interactive touch buttons placed in the bottom 50% of screen. Tapping correct Arabic nouns (*Kitabun*, *Madrasatun*, *Qalamun*, *Sayyaratun*, *Muslimun*, *Muslimatun*) fires laser beams at the opponent's tower!
   - **Game 3 (`misi-mahram-klasifikasi`)**:
     - Engine: `SWIPE_CARD`, Creator: `guru_fiqih`, Subject: `PAI / Fiqih Munakahat`, Grade: `12`, Plays: `950`.
     - Features: Swipe Left (*Bukan Mahram*) or Swipe Right (*Mahram*) using mouse/touch or Left/Right arrow keys, 3 Hearts, Combo Multiplier, plus "Kitab Ringkas" summary modal. Cards: *Ibu Kandung (Mahram)*, *Anak Perempuan Paman / Sepupu (Bukan Mahram)*, *Bibi dari Jalur Ayah / Ammah (Mahram)*, *Saudara Ipar (Bukan Mahram)*, *Ibu Susuan (Mahram)*.
   - **Game 4 (`terminal-agen-siber`)**:
     - Engine: `ROLEPLAY_LKPD`, Creator: `inf_smp`, Subject: `Informatika`, Grade: `8`, Plays: `1120`.
     - Features: Interactive 3-Stage Cybersecurity Mission:
       - *Misi 1*: Password Entropy Analyzer (live strength meter).
       - *Misi 2*: Phishing URL Inspector (spot fake bank/school domains).
       - *Misi 3*: Regex Vault Password Creator (must include uppercase, number, symbol, >= 10 chars). Automatically saves score to Gradebook & generates a Mission Accomplished dossier.
   - **Game 5 (`cell-war-battle-arena`)**:
     - Engine: `TURN_BASED_ARENA`, Creator: `bio_sma`, Subject: `Biologi`, Grade: `11`, Plays: `760`.
     - Features: 2-Group Turn-Based Classroom Battle (Kelompok Mitokondria vs Kelompok Ribosom) with HP bars, 20-second turn timer, and *Kartu Ihsan* bonus lifeline.

2. **1 Active High-Security CBT Exam Packet (`uas-informatika-2026`)**:
   - Title: `"Ujian Akhir Semester (UAS) Ganjil - Informatika & Literasi Digital"`
   - Token: `"UJIAN26"`, Max Tab Switches: `3`, Duration: `60 menit`.
   - 5 HOTS Questions (Algoritma Pemrograman, Keamanan Jaringan, Basis Data, Etika AI, Struktur Data) with 5 options (`A`–`E`), font-size adjuster (`A- / A / A+`), and "Ragu-ragu" flag toggle.
   - Pre-populate 4 student attempts in `ExamAttempt` for the **Proctor Dashboard**:
     - *Ahmad Fauzi* (Sedang Mengerjakan - 0 Pelanggaran)
     - *Siti Nurhaliza* (🚨 **TERKUNCI OTOMATIS** - 3/3 Pelanggaran Pindah Tab terdeteksi! Ready for live demo of Proctor clicking "🔓 Buka Kunci Sesi")
     - *Rizky Ramadhan* (Butuh Reset Login Perangkat karena laptop mati)
     - *Dewi Lestari* (Selesai - Nilai: 92.5)

3. **1 Complete E-Rapor Record with Live SHA-256 Verification**:
   - Student: `Ahmad Fauzi` (NISN: `0084921034`, Kelas: `X-IPA-1`).
   - Hash: `8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4`
   - Complete breakdown of 7 subjects showing automatic aggregation: `20% Rata-rata Game/LKPD + 20% Tugas + 25% UTS + 35% UAS = Nilai Akhir Rapor`.

---

### 4. WHITE-LABEL 3-PRESET INSTANT SWITCHER (`/dashboard/admin/white-label`)

In the White-Label Admin Studio (and accessible via the bottom Demo Bar), include **3 One-Click Preset Buttons** so during tomorrow's presentation I can show how the entire platform adapts to any school identity in 1 second:
1. **Preset 1: Sekolah Cendekia / Madrasah Unggulan** (Emerald `#059669` + Gold `#d97706`, AI Name: *"Asisten Cendekia AI"*)
2. **Preset 2: SMA Negeri / Sekolah Nasional** (Royal Blue `#2563eb` + Cyan `#0891b2`, AI Name: *"Tutor Pintar SMAN"*)
3. **Preset 3: International Boarding School** (Maroon/Crimson `#be123c` + Slate `#334155`, AI Name: *"Scholar AI Companion"*)
Plus custom inputs for **Nama Sekolah**, **Singkatan**, **NPSN**, **Nama Kepala Sekolah & NIP**, **Slogan**, and **Color Pickers** that immediately update CSS Variables (`--brand-primary`, `--brand-secondary`, `--brand-accent`) across the entire app and on the E-Rapor Kop Surat!

---

### 5. EXECUTION STEPS FOR YOU (CLAUDE CODE)

Execute these steps autonomously right now without stopping for confirmation:
1. Initialize the project dependencies (`prisma`, `@prisma/client`, `lucide-react`, `framer-motion`, `clsx`, `tailwind-merge`).
2. Write `CLAUDE.md` and `prisma/schema.prisma`.
3. Run `npx prisma db push` and seed the database using `prisma/seed.ts`.
4. Implement all components, contexts, 5 playable game engines, the High-Security CBT room (with real `visibilitychange` tab-switch detection & Fullscreen lock), the Proctor Dashboard, the Python Virtual Lab (with interactive code execution runner), the Voice-enabled AI Tutor Drawer (with automatic CBT Exam Lockout check), and the Printable A4 E-Rapor with SVG QR Code & `/verify/[hash]` page.
5. Run `npm run build` or type-check to verify there are **zero TypeScript or Next.js compilation errors**, then start the server or give me the final confirmation to run `npm run dev`.
# Master Architecture & Product Blueprint: White-Label Enterprise Gamified LMS, High-Security CBT & E-Rapor

**Referensi Studi Kasus:** Cendekia Edu LMS (`https://www.cendekiaedu.id/`)  
**Target Sistem:** White-Label Configurable School Ecosystem (SIAKAD, E-Rapor, CBT UTS/UAS, Gamified Learning, Virtual Lab & AI Tutor)  
**Target Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL, Redis, S3/R2 Private Storage  
**Development Agent:** Claude Code CLI (VS Code)

---

## BAGIAN 1: Ringkasan Arsitektur Sistem Referensi (Cendekia Edu)

Berdasarkan inspeksi struktur DOM dan modul fungsional pada `cendekiaedu.id`, sistem referensi merupakan **Hybrid Gamified Learning & Interactive Content Hub** yang terbagi menjadi lima domain utama:

1. **Interactive Game Engine & Gamified LKPD (Client-Side State Heavy):** Memuat *mini-games* edukasi berbasis DOM/Canvas yang dibuat oleh pengajar. Logika permainan dieksekusi di sisi klien (*browser*) dan mengirimkan metrik akhir (*play count*, *high score*) ke server.
2. **Perpustakaan Materi & CMS (Content Delivery):** Direktori modul ajar dan LKS terstruktur berdasarkan jenjang (SMP/SMA), tingkat kelas (Kelas 7–12), dan mata pelajaran, serta kanal publikasi artikel/blog.
3. **Virtual Labs & Embedded Code Editor:** Lingkungan *sandbox* bagi siswa untuk mengeksekusi kode (Python/Scratch) atau simulasi laboratorium virtual langsung dari peramban.
4. **Asisten Cendekia AI & Voice Navigation:** Modul tutor cerdas terintegrasi yang memadukan *Web Speech API* (`SpeechRecognition` dan `SpeechSynthesis`) dengan *Large Language Model* (LLM) sesuai konteks kurikulum SMP/SMA.
5. **Role-Based Dashboard:** Portal otentikasi bagi Guru (kreator konten/game, pemantau skor LKPD) dan Siswa/Publik.

### Tabel Perbandingan Tech Stack (Eksisting vs Target Rekayasa Ulang)

| Komponen | Estimasi Teknologi Eksisting | Rekomendasi Stack Enterprise (White-Label) | Alasan Teknis & Fungsi Utama |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Vanilla JS / Alpine.js / React Hybrid | **Next.js (App Router) + TypeScript** | Mendukung SSR untuk SEO Blog/Materi, serta *Client Components* reaktif untuk *state* game interaktif, CBT, dan Virtual Lab. |
| **Styling & Theming** | Tailwind CSS + Custom Animations | **Tailwind CSS + CSS Variables + shadcn/ui** | Mendukung **Dynamic White-Labeling** (ganti warna sekolah dari database tanpa *rebuild* kode) dan responsif untuk layar kelas (IFP). |
| **Game & Lab Engine** | DOM Manipulation + HTML5 Canvas | **HTML5 Canvas / Phaser.js + Pyodide WASM** | Menangani *game loop* 60fps, efek suara interaktif, serta eksekusi kode Python di *browser* via WebAssembly tanpa risiko keamanan server. |
| **Voice & AI Tutor** | Web Speech API + LLM Wrapper | **Web Speech API + Vercel AI SDK** | Menangkap input mikrofon siswa secara *native* dan melakukan *streaming* respons tutor AI (otomatis mati saat siswa ujian CBT). |
| **Backend & API** | PHP (Laravel) / Node.js Monolith | **Next.js Server Actions & Route Handlers** | Menyediakan REST/RPC untuk validasi ujian *server-side*, agregasi nilai rapor, dan *proxy* aman ke API LLM. |
| **Database Utama** | MySQL / MariaDB | **PostgreSQL + Prisma ORM** | Menjamin integritas referensial (ACID) untuk SIAKAD/Rapor, serta mendukung tipe data `JSONB` untuk menyimpan konfigurasi berbagai genre game. |
| **Caching & Timer** | In-Memory / File Cache | **Redis (Upstash)** | Menyimpan *Server-Authoritative Timer* saat ujian CBT, *Real-time Leaderboard*, dan *rate-limiting* endpoint AI. |
| **Object Storage** | Local Server Storage (`/public`) | **Private S3 / Cloudflare R2** | Menyimpan PDF E-Rapor dan dokumen sensitif siswa di *private bucket* yang hanya bisa diakses via *Pre-Signed URL* berbatas waktu. |

---

## BAGIAN 2: Katalog Fitur Lengkap dari Referensi Cendekia Edu

Berikut adalah daftar fitur fungsional yang ada pada sistem referensi yang wajib dipertahankan pada produk Anda:

### 2.1. Modul Multi-Genre Game Engine & Gamifikasi
1. **Kuis Bergaya "Who Wants to Be a Millionaire" (*Muzakki Quiz Engine*):**
   * Pemilihan materi per tingkat kelas (Kelas 7–12) disertai kartu ringkasan materi (*micro-learning*) sebelum bermain.
   * **3 Mode Tantangan:** Mode Normal (60 detik/soal), Mode Cepat (10 detik/soal), dan Mode Marathon (tanpa bantuan).
   * **5 Sistem Bantuan (*Lifelines*):** *50:50* (eliminasi 2 opsi salah), *2x Kesempatan Menjawab*, *Tanya Jamaah/Teman* (statistik persentase opsi), *Tanya Guru/Ustadz* (petunjuk teks), dan *Freeze* (hentikan waktu).
   * Konversi skor ke tingkatan level dan kalkulator tematik (misal: Kalkulator Zakat 2,5%).
2. **Puzzle Match-3 Edukasi (*Crush Engine*):**
   * Mekanisme geser dan cocokkan 3+ ubin (*tile-matching*) dengan batasan jumlah langkah (*moves limit*) dan target pengumpulan item per level (hingga 25 level).
   * *Power-ups* otomatis saat kombo 4+ ubin, diselingi *pop-up* kutipan materi/ayat/rumus di panel atas.
3. **Interactive Flat Panel (IFP) / Multiplayer Split-Screen Games (Khusus Layar Sentuh Kelas):**
   * **Split-Screen Tower Battle (*Pertempuran Menara*):** Layar terbagi dua (Tim Kiri vs Tim Kanan). Siswa menyentuh kosakata/item yang jatuh sesuai kategorinya untuk menembak menara lawan dalam batas waktu 60 detik.
   * **Turn-Based Group Quiz (*Battle Arena*):** Pertarungan kuis bergilir antar dua kelompok dengan timer 20 detik per soal dan fitur kartu bantuan (*Kartu Ihsan*).
4. **Swipe Card & Case Study Engine (*Misi Klasifikasi*):**
   * **Mode Cepat (Swipe Kanan/Kiri):** Mengklasifikasikan kartu konsep ke dalam dua kategori biner dengan sistem 3 nyawa (*hearts*) dan *combo multiplier*.
   * **Mode Studi Kasus:** Analisis cerita kontekstual dilengkapi modul bacaan ringkas.
5. **Simulasi Roleplay & LKPD Interaktif (*Terminal Agen Siber*):**
   * Lembar Kerja Peserta Didik (LKPD) bertahap berbasis misi (misal: uji kekuatan *password*, deteksi tautan *phishing*, pembuatan *password* dengan validasi *regex* langsung).

### 2.2. Modul AI Tutor, Akademik & Utilitas
* **AI Tutor Kontekstual:** *Chatbot* dengan filter berlapis (**Jenjang SMP/SMA** -> **Kelas 7–12** -> **Mata Pelajaran**) agar jawaban AI tetap berada di koridor kurikulum.
* **Voice-Controlled Navigation:** Fitur mikrofon ("Bicara Sekarang") berbasis *Web Speech API* untuk menavigasi halaman atau bertanya menggunakan suara.
* **Perpustakaan Materi & Blog Pendidikan:** Katalog modul dengan filter jenjang/mapel, atribusi *username* guru pembuat, serta penghitung transparan (`Play Count` & `Read Count`).
* **Kontrol UX Global:** Pengalih dwi-bahasa (**Indonesia / English**) dan tombol *Mute/Unmute* audio permainan.

---

## BAGIAN 3: Analisis Kesenjangan (Gap Analysis) & Upgrade Fitur Enterprise

Untuk menjadikan LMS ini siap menangani **Pengarsipan Dokumen Resmi (E-Rapor)**, **Keamanan Tingkat Tinggi**, dan **Ujian Formal (UTS, UAS, Ujian Sekolah)**, berikut adalah peningkatan arsitektur yang ditambahkan:

### 3.1. Upgrade Modul High-Security CBT (UTS, UAS & Ujian Sekolah)
* **100% Server-Side Evaluation:** Kunci jawaban (`correctOptionId`) tidak pernah dikirim ke *browser* untuk mencegah kebocoran melalui *Inspect Element / Network Tab*.
* **Deterministic Question & Option Shuffling:** Soal dan pilihan ganda diacak secara unik untuk setiap siswa menggunakan algoritma *seeded PRNG* (`studentId + examId`), sehingga urutan soal tetap konsisten meskipun siswa me-*refresh* halaman.
* **Anti-Cheating & Lockdown Suite:**
  * **Fullscreen Enforcement & Visibility Listener:** Mendeteksi event `visibilitychange` dan `window.onblur`. Jika siswa keluar dari layar penuh atau berpindah tab melebihi batas (`maxTabSwitches`), lembar ujian otomatis terkunci dan hanya bisa dibuka kembali oleh Pengawas.
  * **Safe Exam Browser (SEB) Integration:** Validasi header `X-SafeExamBrowser-RequestHash` untuk ujian krusial agar siswa tidak bisa menggunakan *shortcut* OS (`Alt+Tab`, `PrintScreen`).
  * **Automatic AI Tutor Lockout:** Memblokir akses ke endpoint `/api/ai-tutor` secara otomatis selama siswa memiliki sesi ujian CBT yang masih aktif.
* **Fault-Tolerant State & Proctor Dashboard:**
  * **Server-Authoritative Timer:** Sisa waktu dihitung dari `expiresAt` di server, kebal terhadap manipulasi jam di perangkat siswa.
  * **Debounced Auto-Save & Offline Queue:** Jawaban tersimpan per klik ke database dan di-*cache* di `IndexedDB` lokal jika koneksi terputus sementara.
  * **Real-Time Proctor Dashboard:** Panel pengawas ruang ujian untuk menghasilkan **Token 6 Digit Dinamis**, memantau indikator pelanggaran siswa secara *live*, mereset sesi perangkat yang mati, dan menambah waktu khusus.

### 3.2. Upgrade Modul Pengarsipan Dokumen Sekolah & E-Rapor
* **Struktur SIAKAD Terikat:** Pengelolaan Tahun Ajaran (`2026/2027`), Semester (`Ganjil/Genap`), Rombongan Belajar (`X-IPA-1`), Wali Kelas, serta keterikatan akun Orang Tua/Wali dengan Siswa.
* **Automated Gradebook Engine:** Mengagregasi otomatis nilai dari **Skor Game/LKPD Harian** + **Tugas** + **UTS** + **UAS** berdasarkan bobot persentase kurikulum menjadi nilai akhir rapor.
* **Immutable E-Rapor PDF & Private Vault:**
  * Setelah periode penilaian ditutup, sistem merender PDF E-Rapor resmi dan menyimpannya di **Private Object Storage (S3/R2)**.
  * Dokumen rapor hanya dapat diunduh melalui **Pre-Signed URL** yang kedaluwarsa dalam 5 menit.
* **Cryptographic QR Verification (SHA-256):** Setiap PDF E-Rapor dan Transkrip dilengkapi QR Code unik yang mengarah ke `/verify/[sha256Hash]` untuk memverifikasi keaslian dokumen dan mencegah pemalsuan nilai cetak.

### 3.3. Upgrade Keamanan Data & Kepatuhan (UU PDP & OWASP ASVS)
* **Anti-IDOR & Strict RBAC/ABAC:** Validasi kepemilikan data di setiap endpoint (Siswa hanya bisa mengunduh rapor miliknya sendiri; Guru hanya bisa mengubah nilai kelas yang diampunya).
* **Single Active Device Session Lock:** Mencegah 1 akun siswa login di 2 perangkat berbeda secara bersamaan saat ujian berlangsung (anti-joki).
* **Field-Level Encryption (AES-256):** Mengenkripsi data identitas sensitif siswa (NIK, data sosial/ekonomi keluarga) di dalam database.
* **Immutable Audit Trail (`AuditLog`):** Tabel *append-only* yang merekam setiap perubahan nilai rapor atau pembukaan kunci ujian (`actorId`, `ipAddress`, `oldValue`, `newValue`, `reason`, `timestamp`).

---

## BAGIAN 4: Arsitektur White-Label (Ganti Identitas Sekolah Secara Instan)

Agar sistem dapat dibangun 100% terlebih dahulu dan identitas sekolah klien dapat diterapkan kapan saja tanpa menyentuh kode program:

1. **Singleton Configuration Table (`SchoolConfig`):** Seluruh teks nama sekolah, singkatan, NPSN, slogan, logo, gambar kop surat E-Rapor, tanda tangan Kepala Sekolah, palet warna tema, hingga nama dan karakter AI Tutor disimpan di database.
2. **Dynamic CSS Variables Injection:** `RootLayout` Next.js membaca warna heksadesimal dari `SchoolConfig` dan menyuntikkannya sebagai variabel CSS (`--brand-primary`, `--brand-secondary`) yang dikonsumsi oleh konfigurasi Tailwind CSS.
3. **Dynamic PDF Header & Prompt Injection:** Mesin pencetak PDF E-Rapor dan *system prompt* AI Tutor menarik identitas sekolah secara *real-time* dari `SchoolConfig`.

---

## BAGIAN 5: Master Schema Database (`prisma/schema.prisma`)

Salin skema berikut ke dalam file `prisma/schema.prisma` di proyek Anda:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  CURRICULUM_ADMIN
  PRINCIPAL
  HOMEROOM_TEACHER
  SUBJECT_TEACHER
  PROCTOR
  STUDENT
  PARENT
}

enum ExamType {
  DAILY_QUIZ
  UTS
  UAS
  SCHOOL_EXAM
  TRYOUT
}

enum GameEngineType {
  MILLIONAIRE_QUIZ
  MATCH_THREE
  SWIPE_CARD
  IFP_TOWER_BATTLE
  TURN_BASED_ARENA
  ROLEPLAY_LKPD
}

enum MaterialType {
  MODUL_PDF
  INTERACTIVE_LKPD
  VIRTUAL_LAB
  ARTICLE_BLOG
}

// 1. WHITE-LABEL CONFIGURATION (SINGLETON)
model SchoolConfig {
  id                    String   @id @default("default_tenant")
  schoolName            String   @default("Nusantara Edu LMS")
  schoolShortName       String   @default("NusantaraEdu")
  npsn                  String?
  nss                   String?
  tagline               String   @default("Platform Pembelajaran Digital, Evaluasi CBT & E-Rapor Terpadu")
  address               String?  @db.Text
  contactEmail          String?
  logoUrl               String?
  faviconUrl            String?
  reportHeaderUrl       String?  // Kop surat resmi untuk PDF E-Rapor
  principalName         String?
  principalNip          String?
  principalSignatureUrl String?
  primaryColorHex       String   @default("#059669") // Default Emerald-600
  secondaryColorHex     String   @default("#0284c7") // Default Sky-600
  aiTutorName           String   @default("Asisten Pintar AI")
  aiSystemPromptBase    String   @default("Anda adalah tutor akademik sekolah yang ramah, objektif, dan mendidik sesuai kurikulum nasional.") @db.Text
  curriculumType        String   @default("KURIKULUM_MERDEKA")
  defaultLanguage       String   @default("id")
  updatedAt             DateTime @updatedAt
}

// 2. USERS, AUTH & SINGLE-SESSION LOCK
model User {
  id                  String    @id @default(cuid())
  username            String    @unique
  email               String?   @unique
  passwordHash        String
  fullName            String
  role                Role      @default(STUDENT)
  nisnOrNip           String?   @unique
  encryptedNik        String?   // AES-256 encrypted for UU PDP compliance
  activeSessionToken  String?   // Enforces single active device during CBT
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  studentClassrooms   ClassroomStudent[]
  createdMaterials    LearningMaterial[]
  createdGames        EducationalGame[]
  gameSessions        GameSession[]
  examAttempts        ExamAttempt[]
  reportCards         ReportCard[]
  auditLogs           AuditLog[]
}

// 3. ACADEMIC STRUCTURE (SIAKAD)
model AcademicYear {
  id          String      @id @default(cuid())
  yearLabel   String      // e.g., "2026/2027"
  semester    Int         // 1 (Ganjil) or 2 (Genap)
  isActive    Boolean     @default(false)
  classrooms  Classroom[]
  exams       ExamPacket[]
  reportCards ReportCard[]
}

model Classroom {
  id                String             @id @default(cuid())
  academicYearId    String
  academicYear      AcademicYear       @relation(fields: [academicYearId], references: [id])
  name              String             // e.g., "X-IPA-1", "VII-A"
  level             String             // "SMP" or "SMA"
  gradeLevel        Int                // 7, 8, 9, 10, 11, 12
  homeroomTeacherId String
  students          ClassroomStudent[]
}

model ClassroomStudent {
  id          String    @id @default(cuid())
  classroomId String
  classroom   Classroom @relation(fields: [classroomId], references: [id])
  studentId   String
  student     User      @relation(fields: [studentId], references: [id])

  @@unique([classroomId, studentId])
}

model Subject {
  id          String             @id @default(cuid())
  code        String             @unique // e.g., "INF", "PAI", "MTK", "BIO"
  name        String
  level       String             // "SMP", "SMA", or "ALL"
  gradeLevels Int[]              // [7, 8, 9, 10, 11, 12]
  materials   LearningMaterial[]
  games       EducationalGame[]
  examPackets ExamPacket[]
}

// 4. MATERIALS, VIRTUAL LABS & BLOG CMS
model LearningMaterial {
  id            String       @id @default(cuid())
  slug          String       @unique
  title         String
  authorId      String
  author        User         @relation(fields: [authorId], references: [id])
  subjectId     String?
  subject       Subject?     @relation(fields: [subjectId], references: [id])
  gradeLevel    Int?
  materialType  MaterialType
  fileKey       String?      // S3/R2 key for PDF/Attachments
  bodyMarkdown  String?      @db.Text
  sandboxConfig Json?        // Starter code & test cases for Virtual Lab / Pyodide
  viewsCount    Int          @default(0)
  isPublished   Boolean      @default(true)
  createdAt     DateTime     @default(now())
}

// 5. GAMIFIED ENGINE & LKPD
model EducationalGame {
  id             String         @id @default(cuid())
  slug           String         @unique
  title          String
  creatorId      String
  creator        User           @relation(fields: [creatorId], references: [id])
  subjectId      String
  subject        Subject        @relation(fields: [subjectId], references: [id])
  gradeLevel     Int
  engineType     GameEngineType
  configJson     Json           // Stores levels, questions, lifelines, rules (JSONB)
  playCount      Int            @default(0)
  isPublished    Boolean        @default(true)
  createdAt      DateTime       @default(now())
  sessions       GameSession[]
}

model GameSession {
  id              String          @id @default(cuid())
  gameId          String
  game            EducationalGame @relation(fields: [gameId], references: [id])
  studentId       String?
  student         User?           @relation(fields: [studentId], references: [id])
  playerAlias     String
  classUnit       String?
  score           Int
  durationSeconds Int
  telemetryJson   Json            // Detailed mission/question breakdown for teacher gradebook
  completedAt     DateTime        @default(now())
}

// 6. HIGH-SECURITY CBT (UTS / UAS / USBN)
model ExamPacket {
  id                  String         @id @default(cuid())
  title               String
  examType            ExamType
  subjectId           String
  subject             Subject        @relation(fields: [subjectId], references: [id])
  academicYearId      String
  academicYear        AcademicYear   @relation(fields: [academicYearId], references: [id])
  gradeLevel          Int
  durationMinutes     Int
  requireSeb          Boolean        @default(false)
  sebConfigKeyHash    String?
  maxTabSwitches      Int            @default(3)
  dynamicToken        String         // 6-digit rotating proctor token
  tokenExpiresAt      DateTime
  startTime           DateTime
  endTime             DateTime
  questions           ExamQuestion[]
  attempts            ExamAttempt[]
}

model ExamQuestion {
  id              String     @id @default(cuid())
  examPacketId    String
  examPacket      ExamPacket @relation(fields: [examPacketId], references: [id])
  questionText    String     @db.Text
  optionsJson     Json       // Array of { id, text, mediaUrl } - NEVER send correctOptionId to client
  correctOptionId String     // Strictly kept on server for grading
  weight          Float      @default(1.0)
}

model ExamAttempt {
  id                 String     @id @default(cuid())
  examPacketId       String
  examPacket         ExamPacket @relation(fields: [examPacketId], references: [id])
  studentId          String
  student            User       @relation(fields: [studentId], references: [id])
  startedAt          DateTime   @default(now())
  expiresAt          DateTime   // Server-authoritative deadline
  submittedAt        DateTime?
  answersJson        Json       @default("{}") // { [questionId]: selectedOptionId }
  violationCount     Int        @default(0)
  violationLogsJson  Json       @default("[]") // Timestamps of tab switches / fullscreen exits
  isLockedByProctor  Boolean    @default(false)
  finalScore         Float?

  @@unique([examPacketId, studentId])
}

// 7. ARCHIVAL & E-RAPOR VAULT
model ReportCard {
  id                 String       @id @default(cuid())
  studentId          String
  student            User         @relation(fields: [studentId], references: [id])
  academicYearId     String
  academicYear       AcademicYear @relation(fields: [academicYearId], references: [id])
  classroomName      String
  gradesSnapshotJson Json         // Immutable snapshot of all subject scores, attendance & notes
  privatePdfKey      String?      // S3/R2 private object key
  sha256Hash         String       @unique // Used for public QR verification (/verify/[hash])
  isLocked           Boolean      @default(false)
  publishedAt        DateTime?
  createdAt          DateTime     @default(now())

  @@unique([studentId, academicYearId])
}

// 8. IMMUTABLE SECURITY AUDIT TRAIL
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String
  actor       User     @relation(fields: [actorId], references: [id])
  action      String   // e.g., "UPDATE_FINAL_GRADE", "UNLOCK_EXAM_SESSION", "PUBLISH_RAPOR"
  targetTable String
  targetId    String
  oldValue    Json?
  newValue    Json?
  reason      String?
  ipAddress   String
  userAgent   String?
  createdAt   DateTime @default(now())
}
```

---

## BAGIAN 6: File Konfigurasi `CLAUDE.md` & Urutan Prompt Eksekusi VS Code

Simpan bagian di bawah ini sebagai file `CLAUDE.md` di *root folder* proyek Anda agar **Claude Code** mematuhi seluruh standar arsitektur dan keamanan selama menulis kode:

```markdown
# CLAUDE.md - Project Architectural Rules & Context

## 1. Project Overview
White-Label Enterprise Gamified LMS, High-Security CBT (UTS/UAS), & Digital Document Archival (E-Rapor) built with:
- **Framework**: Next.js (App Router), React, TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + shadcn/ui (Strictly using dynamic CSS variables for white-label theming)
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: S3-Compatible Private Object Storage (AWS S3 / Cloudflare R2) for E-Rapor & Documents

## 2. Non-Negotiable Coding Rules (CRITICAL)
1. **Zero Hardcoded School Identity**: NEVER hardcode school names, logos, or specific brand colors in components. Always read from `SchoolConfig` via `useTenantConfig()` or `getSchoolConfig()`, and use semantic Tailwind classes (`bg-brand-primary`, `text-brand-secondary`).
2. **Server-Side Grading Only**: In CBT (`ExamPacket`) and graded LKPD endpoints, NEVER include `correctOptionId` or answer keys in client-facing API responses or Client Component props.
3. **Anti-IDOR & RBAC Enforcement**: Every API Route and Server Action MUST verify session authentication and resource ownership. Students can only access their own `ExamAttempt` and `ReportCard`.
4. **AI Tutor Exam Lockout**: Before processing any request in `/api/ai-tutor/chat`, query `ExamAttempt` to verify the student does NOT have an active, unsubmitted exam session (`submittedAt == null && expiresAt > now()`). If active, return `403 Forbidden`.
5. **Immutable Audit Logging**: Any mutation to grades, exam scores, proctor unlocks, or report cards MUST execute inside a `prisma.$transaction` that simultaneously inserts a record into `AuditLog`.
```

### Urutan Prompt Bertahap untuk Claude Code di Terminal VS Code

Jalankan perintah berikut secara berurutan kepada Claude Code:

1. **Fase 1 — Inisialisasi & White-Label Theme Engine:**
   > *"Baca `CLAUDE.md` dan `prisma/schema.prisma`. Buat struktur Next.js App Router dengan TypeScript dan Tailwind CSS. Buat `TenantProvider` di `RootLayout` yang mengambil konfigurasi dari tabel `SchoolConfig` (buat seed default jika belum ada), menyuntikkan CSS variables (`--brand-primary`, `--brand-secondary`) ke tag `<html>`, serta bangun halaman `/dashboard/admin/white-label` agar Super Admin bisa mengubah nama sekolah, logo, warna tema, kop surat rapor, dan identitas AI Tutor secara real-time."*
2. **Fase 2 — Autentikasi, RBAC 8-Role & Single-Device Session Lock:**
   > *"Implementasikan sistem autentikasi menggunakan JWT di dalam HttpOnly Cookie dengan dukungan 8 Role sesuai schema. Buat middleware RBAC dan fitur Single Active Device Session (`activeSessionToken`) sehingga satu akun siswa tidak bisa login di dua perangkat berbeda secara bersamaan saat ujian berlangsung."*
3. **Fase 3 — High-Security CBT (UTS/UAS) & Proctor Dashboard:**
   > *"Bangun modul CBT untuk UTS/UAS: (1) Endpoint mulai ujian dengan validasi token 6 digit dinamis & pengecekan header Safe Exam Browser opsional, (2) Pengacakan soal & opsi menggunakan deterministic seed `studentId + examId` tanpa mengirim `correctOptionId` ke client, (3) Antarmuka ujian client dengan Fullscreen lock, deteksi pindah tab (`visibilitychange`), Server-Authoritative Timer, dan auto-save per klik, serta (4) Dashboard Pengawas real-time untuk memantau pelanggaran dan membuka kunci sesi siswa."*
4. **Fase 4 — Modular Multi-Genre Game Engine & Sandboxed Virtual Lab:**
   > *"Bangun komponen `<GameContainerShell/>` (fullscreen toggle untuk layar IFP kelas, mute audio, timer, skor) beserta 5 adapter game yang membaca `configJson` dari `EducationalGame`: Millionaire Quiz (dengan 5 lifeline), Match-3 Puzzle, Swipe Card, Split-Screen IFP Tower Battle (2 pemain di layar sentuh), dan Roleplay LKPD. Tambahkan halaman Virtual Lab Code Editor Python menggunakan Pyodide WebAssembly di dalam sandbox."*
5. **Fase 5 — Asisten AI Tutor + Voice Navigation (dengan Exam Lockout):**
   > *"Bangun komponen floating widget dan halaman penuh untuk AI Tutor beserta Voice Navigation menggunakan Web Speech API (`SpeechRecognition` & `SpeechSynthesis`). Sertakan filter Jenjang, Kelas, dan Mata Pelajaran. Pastikan API route `/api/ai-tutor/chat` mengecek tabel `ExamAttempt` dan menolak akses jika siswa sedang ujian aktif."*
6. **Fase 6 — E-Rapor PDF Engine, Private S3 Vault & QR SHA-256 Verification:**
   > *"Bangun modul SIAKAD & E-Rapor: agregasi nilai harian (Game/LKPD) + UTS + UAS per semester, fitur Lock & Publish Rapor yang men-generate PDF resmi menggunakan kop surat dan tanda tangan dari `SchoolConfig` beserta QR Code berisi hash SHA-256, simpan ke S3/R2 Private Bucket, buat endpoint Pre-Signed URL berdurasi 5 menit untuk unduhan aman, serta halaman publik `/verify/[sha256Hash]` untuk memverifikasi keaslian rapor."*

---

## BAGIAN 7: Metode Audit Non-Invasif (Referensi OSINT & DevTools)

Prosedur standar untuk menginspeksi infrastruktur, *headers*, dan kontrak API secara legal:

```bash
# 1. Cek A Record (IPv4), AAAA (IPv6), dan Nameserver
dig www.cendekiaedu.id +short
dig cendekiaedu.id NS +short

# 2. Identifikasi ISP/Provider Hosting & ASN dari IP
curl -s https://ipinfo.io/$(dig +short www.cendekiaedu.id | tail -n1)/json

# 3. Inspeksi HTTP Response Headers & Web Server
curl -I -L https://www.cendekiaedu.id/
```
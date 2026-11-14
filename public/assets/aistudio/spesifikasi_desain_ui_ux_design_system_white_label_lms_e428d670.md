# UI/UX Design System & Wireframe Specification: Adaptive Chameleon Design System
**Target Sistem:** White-Label Enterprise Gamified LMS, High-Security CBT & E-Rapor  
**Pendekatan Visual:** *3-Mode Contextual Atmosphere* (Academic Bento Grid + Tactile Arcade Gamification + High-Focus Zen CBT)  
**Tech Stack UI:** Next.js App Router, Tailwind CSS, CSS Variables (HSL Dynamic Theming), `shadcn/ui`, Lucide Icons, Framer Motion  

---

## 1. Filosofi Desain: *3-Mode Contextual Atmosphere*

Tantangan utama pada LMS *Hybrid* adalah menjaga keseimbangan antara **wibawa akademik** (saat ujian resmi UTS/UAS dan pembagian E-Rapor) dengan **keseruan interaktif** (saat siswa bermain *mini-games* atau mengerjakan LKPD). Sistem ini menerapkan **3 Mode Atmosfer Visual** yang berubah secara otomatis mengikuti rute halaman yang diakses pengguna:

| Mode Konteks | Area Penggunaan | Karakteristik Visual & Psikologi Warna |
| :--- | :--- | :--- |
| **1. Academic Precision Mode** *(Default)* | Dashboard SIAKAD, Perpustakaan Materi, E-Rapor, Panel Admin & Guru | **Bersih, terstruktur, dan berwibawa.** Menggunakan latar belakang *Off-White/Slate* (`#F8FAFC`), kartu *Bento Grid* dengan border tipis (`1px solid #E2E8F0`), tipografi tajam, dan aksen warna *Brand Primary* sekolah secara elegan. |
| **2. Arcade & Lab Immersion Mode** | Arena Game Edukasi, LKPD Agen Siber, Virtual Lab, Layar Kelas (IFP) | **Taktil, kontras tinggi, dan imersif.** Navigasi samping (*sidebar*) otomatis tersembunyi (*collapsed*). Tombol memiliki efek tiga dimensi (*3D pushable buttons* dengan `border-b-4` yang memendek saat ditekan), umpan balik audio/visual, dan tema gelap (*dark console*) opsional. |
| **3. High-Focus Zen Lockdown Mode** | Ruang Ujian CBT (UTS, UAS, Ujian Sekolah) | **Bebas distraksi & menenangkan.** Seluruh *widget* (termasuk *floating AI Tutor*, lonceng notifikasi, dan menu navigasi) dilenyapkan. Menggunakan palet warna netral berkontras tinggi untuk keterbacaan teks soal berjam-jam, dilengkapi indikator status koneksi dan timer yang presisi. |

---

## 2. Arsitektur *White-Label Design Tokens* (CSS Variables & Tailwind)

Agar identitas visual sekolah klien (warna logo, warna sekunder, dan aksen) dapat diubah secara instan dari database (`SchoolConfig`) tanpa menyentuh kode komponen, seluruh warna didefinisikan menggunakan **Semantic CSS Variables** pada `app/globals.css`:

```css
/* app/globals.css - White-Label Semantic Tokens */
@layer base {
  :root {
    /* Diinjeksi secara dinamis oleh TenantProvider dari tabel SchoolConfig */
    --brand-primary: 160 84% 39%;       /* Default: Emerald (#10B981) - Bisa diubah ke Navy/Maroon/Blue */
    --brand-primary-fg: 0 0% 100%;      /* Warna teks di atas warna primary */
    --brand-secondary: 199 89% 48%;     /* Default: Sky Blue (#0EA5E9) */
    --brand-accent: 38 92% 50%;         /* Default: Amber Gold (#F59E0B) - Khusus Gamifikasi/XP/Poin */

    /* Surface & Background Tokens (Konsisten untuk menjaga keterbacaan) */
    --bg-canvas: 210 40% 98%;           /* #F8FAFC - Latar belakang utama */
    --bg-surface: 0 0% 100%;            /* #FFFFFF - Permukaan Kartu Bento & Modul */
    --bg-elevated: 210 40% 96%;         /* #F1F5F9 - Hover state & Header Tabel */
    --border-subtle: 214 32% 91%;       /* #E2E8F0 - Garis pemisah tipis */

    /* Semantic Status (Standar Internasional untuk CBT & E-Rapor) */
    --status-success: 142 71% 45%;      /* Soal Terjawab / Lulus KKM / Tersimpan */
    --status-warning: 38 92% 50%;       /* Soal Ragu-ragu (Flagged) / Waktu < 15 Menit */
    --status-danger: 0 84% 60%;         /* Pelanggaran CBT / Di bawah KKM / Waktu < 5 Menit */
  }
}
```

### Konfigurasi `tailwind.config.ts` untuk Konsumsi Token

```typescript
// tailwind.config.ts (Bagian theme.extend.colors)
colors: {
  brand: {
    primary: "hsl(var(--brand-primary))",
    "primary-fg": "hsl(var(--brand-primary-fg))",
    secondary: "hsl(var(--brand-secondary))",
    accent: "hsl(var(--brand-accent))",
  },
  surface: {
    canvas: "hsl(var(--bg-canvas))",
    card: "hsl(var(--bg-surface))",
    elevated: "hsl(var(--bg-elevated))",
  },
  status: {
    success: "hsl(var(--status-success))",
    warning: "hsl(var(--status-warning))",
    danger: "hsl(var(--status-danger))",
  }
}
```

---

## 3. Sistem Tipografi & Hirarki Keterbacaan (*3-Font Pairing*)

1. **Heading, Navigasi & Display Skor (`Plus Jakarta Sans` atau `Outfit`):**
   * Memberikan kesan modern, geometris, ramah, namun sangat rapi untuk judul dashboard dan angka statistik di layar besar.
2. **Body Text, Materi Bacaan & Naskah Soal CBT (`Inter`):**
   * Memiliki *x-height* tinggi dan jarak antar-huruf proporsional sehingga mata siswa tidak cepat lelah saat membaca wacana soal ujian yang panjang.
3. **Code Editor, Timer Ujian & Hash Verifikasi (`JetBrains Mono`):**
   * Wajib menggunakan properti `font-mono tabular-nums` pada **Server-Authoritative Timer** di ruang CBT agar lebar setiap digit angka selalu sama dan teks tidak bergeser-geser setiap detik.
   * Digunakan pula pada *Virtual Lab Python Editor*, *Terminal Agen Siber*, nomor **NISN/NIP**, serta **Token Ujian 6 Digit**.

---

## 4. Spesifikasi Tata Letak (*Wireframe Blueprint*) per Modul

### 4.1. Landing Page & Katalog Publik (*The Interactive Showcase*)
* **Top Navigation Bar (`sticky top-0 z-40 backdrop-blur-md bg-white/80`):**
  * Kiri: Logo Dinamis Sekolah + Nama Singkat Sekolah (`schoolShortName`).
  * Tengah: Menu Cepat (`Katalog Game`, `Perpustakaan Materi`, `Virtual Lab`, `Verifikasi E-Rapor`).
  * Kanan: Pengalih Bahasa (`ID / EN`), Tombol `Cek Keaslian Rapor`, dan CTA Utama `Masuk Portal`.
* **Hero Section Interaktif (2 Kolom):**
  * **Kolom Kiri:** *Badge* kurikulum aktif, *Headline* dinamis dari slogan sekolah, statistik agregat *real-time* (Total Materi, Total Game Interaktif, Total Siswa Aktif), dan tombol mulai belajar.
  * **Kolom Kanan (*Live Mini-Game Preview Card*):** Komponen interaktif tempat pengunjung dapat langsung mencoba menjawab 1 soal kuis kilat atau menggeser 1 kartu *Swipe Game* langsung di halaman utama tanpa perlu login terlebih dahulu.
* **Bento Filter & Katalog Kartu:**
  * Filter instan berbentuk *segmented pills* (`Semua Jenjang`, `SMP`, `SMA`, `Kelas 7–12`, dan `Mata Pelajaran`).
  * Setiap kartu game menampilkan: Label Tipe Game (misal: `🎯 Millionaire Quiz` atau `🖥️ Mendukung Layar IFP Kelas`), Judul, Username Guru Pembuat, dan *Counter* (`🔥 1.240x Dimainkan`).

### 4.2. Dashboard Siswa (*Gamified Academic Command Center*)
Menggunakan tata letak **12-Column Asymmetric Bento Grid**:
* **Baris 1 (12 Kolom - *Contextual Status & Active CBT Alert*):**
  * Jika ada jadwal ujian UTS/UAS aktif hari ini, tampilkan **High-Priority Exam Banner** di bagian paling atas dengan kolom input Token 6 Digit.
  * Menampilkan kartu ringkas profil siswa, Kelas/Rombel aktif, *Learning Streak* (jumlah hari belajar beruntun), dan perolehan poin/level gamifikasi.
* **Baris 2 Kiri (8 Kolom - *Active Missions & Continue Learning*):**
  * **Misi LKPD & Game Wajib:** Daftar penugasan dari guru mata pelajaran beserta tenggat waktu dan status penyelesaian.
  * **Modul Terakhir Dibuka:** Akses satu klik untuk melanjutkan bacaan PDF atau *sandbox* kode Python terakhir.
* **Baris 2 Kanan (4 Kolom - *Class Leaderboard & Academic Radar*):**
  * **Papan Peringkat Rombel:** Top 5 siswa dengan skor latihan tertinggi minggu ini di kelasnya.
  * **Peta Kompetensi (Radar Chart):** Visualisasi nilai rata-rata siswa di kelompok mata pelajaran utama.

### 4.3. Ruang Ujian CBT (*High-Focus Zen Lockdown Interface*)
Dirancang khusus dengan prinsip *Zero-Distraction* dan *Anti-Panic*:

```
+-----------------------------------------------------------------------------------+
| [Logo] UAS Matematika - X IPA 1    |  ⏱️ 01:14:22  |  ☁️ Tersimpan  [Layar Penuh] |
+-----------------------------------------------------------------------------------+
|                                                        |  PETA NOMOR SOAL         |
|  SOAL NO. 14 DARI 40               [Ukuran: A- | A | A+] |  [01] [02] [03] [04] [05]|
|  ----------------------------------------------------  |  [06] [07] [08] [09] [10]|
|  Perhatikan grafik fungsi kuadrat berikut...           |  [11] [12] [13] [14*] [15]|
|                                                        |                          |
|  (A) Opsi Jawaban Pertama                              |  Keterangan:             |
|  (B) Opsi Jawaban Kedua (Terpilih - Highlight Primary) |  🟩 Dijawab (13)         |
|  (C) Opsi Jawaban Ketiga                               |  🟨 Ragu-ragu (1)        |
|  (D) Opsi Jawaban Keempat                              |  ⬜ Belum Dijawab (26)   |
|  (E) Opsi Jawaban Kelima                               |                          |
|                                                        |  Status Keamanan:        |
|  [⬅️ Soal Sebelumnya]   [🟨 Ragu-ragu]   [Selanjutnya ➡️] |  🛡️ Pelanggaran: 0 / 3   |
+-----------------------------------------------------------------------------------+
```

* **Aturan Kritis UI CBT:**
  * Tombol *Floating AI Tutor* **wajib disembunyikan (`display: none`)** dan dinonaktifkan pada level komponen serta API.
  * Pilihan jawaban menggunakan area klik yang luas (`min-h-[56px]`, `p-4`, `rounded-xl`) dengan indikator huruf (`A`, `B`, `C`, `D`, `E`) di dalam kotak tegas agar tidak terjadi salah klik (*misclick*).
  * **Violation Lockdown Overlay:** Saat event `visibilitychange` atau keluar *Fullscreen* terdeteksi, layar soal langsung diburamkan (`backdrop-blur-xl bg-slate-900/90`) dan menampilkan peringatan pelanggaran beserta tombol untuk kembali ke *Fullscreen*. Jika pelanggaran mencapai batas (`3/3`), tampilkan layar kunci yang hanya bisa dibuka oleh Pengawas dari *Proctor Dashboard*.

### 4.4. Antarmuka Layar Sentuh Kelas / IFP (*65–86 Inch Touch Ergonomics*)
Untuk game *Split-Screen Tower Battle* (*Pertempuran Menara*) dan *Turn-Based Group Arena* yang dimainkan oleh siswa di depan kelas menggunakan layar TV pintar berukuran besar:
* **Ergonomi Jangkauan Tangan (*Bottom-Half Action Zone*):**
  * Siswa sering kali tidak dapat menjangkau bagian atas layar TV 75 inci. Oleh sebab itu, **seluruh tombol interaktif tempat siswa mengetuk jawaban wajib berada di separuh bawah layar (`bottom 50%`)**.
  * Separuh bagian atas layar dikhususkan untuk visualisasi grafis (animasi menara, *health bar* kelompok, timer raksasa, dan papan skor).
* **True Split-Screen Multi-Touch Layout:**
  * Layar dibagi secara vertikal (`grid-cols-2`) dengan pembatas tengah yang tegas: **Zona Tim Kiri (Nuansa Biru/Emerald)** dan **Zona Tim Kanan (Nuansa Oranye/Rose)**.
  * Ukuran font minimal untuk soal atau kosakata di mode IFP adalah `text-2xl` hingga `text-4xl` agar terbaca hingga bangku barisan paling belakang di kelas.

### 4.5. Dashboard Pengawas CBT (*Real-Time Proctor Command Center*)
* **Dynamic Token Banner:** Kartu menonjol di bagian atas yang menampilkan **Token Ujian 6 Digit** berukuran besar (`text-5xl font-mono font-bold tracking-widest`) dilengkapi hitung mundur pergantian token otomatis setiap 15 menit dan tombol `Generate Token Baru`.
* **Live Student Grid Monitoring:**
  * Menampilkan kartu status setiap siswa di ruang ujian secara *real-time* dengan filter cepat: `Semua (36)`, `Sedang Mengerjakan (32)`, `🚨 Terkunci / Pelanggaran (2)`, `Selesai (2)`.
  * Setiap kartu siswa memiliki tombol aksi instan bagi pengawas: **`🔓 Buka Kunci Sesi`**, **`🔄 Reset Login Perangkat`** (jika laptop siswa mati dan harus pindah komputer), dan **`➕ Tambah Waktu (+10m)`**.

### 4.6. Tampilan E-Rapor & Halaman Verifikasi QR Publik
* **Portal E-Rapor Siswa/Orang Tua:**
  * Menampilkan ringkasan nilai dalam tabel bersih yang dikelompokkan berdasarkan Kelompok Mata Pelajaran Kurikulum Merdeka / K13, lengkap dengan grafik perkembangan nilai antar-semester.
  * Tombol **`🔒 Unduh PDF E-Rapor Resmi`** yang memicu pembuatan *Pre-Signed URL* (berlaku 5 menit) dengan indikator hitung mundur keamanan.
* **Halaman Verifikasi Publik (`/verify/[sha256Hash]`):**
  * Ketika QR Code pada cetakan rapor dipindai oleh pihak luar (misal: panitia seleksi perguruan tinggi atau beasiswa), halaman ini menampilkan **Sertifikat Keaslian Digital** bercentang hijau dengan rincian: Nama Sekolah (dari `SchoolConfig`), Nama Siswa (disamarkan sebagian untuk privasi, misal: `Sya*** Muh*****`), Tahun Ajaran, Waktu Diterbitkan, Pejabat Penandatangan, dan kecocokan Hash SHA-256.

---

## 5. Standar Kode UI/UX untuk `CLAUDE.md` (Instruksi untuk Claude Code)

Salin blok aturan di bawah ini dan tambahkan ke bagian bawah file `CLAUDE.md` di proyek VS Code Anda agar **Claude Code** selalu menerapkan standar desain ini saat membuat setiap halaman dan komponen:

```markdown
## 3. UI/UX & Component Engineering Standards (Adaptive Chameleon System)
1. **Contextual Layout Switching**:
   - Standard Dashboard & Academic pages (`/dashboard/**`, `/materials/**`, `/rapor/**`): Use clean Bento Grid cards (`rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-200`).
   - Game Arena & Virtual Lab pages (`/games/[slug]/play`, `/labs/**`): Auto-collapse sidebar, enable fullscreen toggle, and use tactile 3D arcade buttons (`rounded-xl font-bold border-b-4 border-black/20 active:border-b-0 active:translate-y-1 transition-all`).
   - High-Security CBT Room (`/cbt/[examId]/room`): Strictly render in Zen Lockdown Mode—hide all global navigation, sidebars, notifications, and the Floating AI Tutor widget.
2. **IFP Classroom Touch Ergonomics**:
   - In `IFP_TOWER_BATTLE` and `TURN_BASED_ARENA` game engines, place all interactive touch buttons in the bottom 55% of the viewport so students can reach them comfortably on 65-inch to 86-inch classroom touchscreens. Use minimum `text-2xl md:text-4xl` for question prompts.
3. **Tabular Monospace for Timers & Codes**:
   - Always apply `font-mono tabular-nums` to CBT countdown timers, 6-digit proctor tokens, NISN/NIP numbers, and SHA-256 verification hashes to prevent layout jitter.
4. **Accessible & High-Contrast Feedback**:
   - Never rely on color alone for CBT question navigation states; pair colors with clear badges or icons (e.g., Checkmark for Answered, Flag icon for Doubtful/Ragu-ragu, Lock icon for Proctor Locked).
```
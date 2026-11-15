# Panduan Menghubungkan & Deploy ke Vercel

Aplikasi **CendekiaEdu White-Label LMS** ini sudah dikonfigurasi untuk berjalan penuh di **Vercel** (`vite build` untuk frontend SPA + Vercel Serverless Function `/api/index.ts` untuk seluruh endpoint `/api/*`).

## 1. File Konfigurasi yang Sudah Disiapkan
- `vercel.json` — Konfigurasi build Vite (`dist`), timeout fungsi serverless, rewrite `/api/(.*)` -> `/api/index`, serta fallback SPA React Router ke `/index.html`.
- `api/index.ts` — Serverless entrypoint untuk seluruh Express API (`/api/health`, `/api/config`, `/api/games`, `/api/materials`, `/api/cbt/*`, `/api/proctor/*`, `/api/erapor`, `/api/ai-tutor/chat`, `/api/ai-game/generate`, `/api/auth/sync`).
- `src/db/index.ts` & `src/db/lms-repo.ts` — Mendukung `DATABASE_URL` / `POSTGRES_URL` (Neon, Supabase, Vercel Postgres) dengan auto-inisialisasi tabel & seed data, serta fallback in-memory jika database belum dihubungkan.

## 2. Langkah Menghubungkan ke Vercel
### Cara A: Via GitHub + Vercel Dashboard (Direkomendasikan)
1. Push repository ini ke GitHub/GitLab/Bitbucket.
2. Buka [vercel.com/new](https://vercel.com/new) dan klik **Import Project** pada repository Anda.
3. Framework Preset akan otomatis terdeteksi sebagai **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
4. Tambahkan **Environment Variables** berikut di **Project Settings → Environment Variables**:
   - `GEMINI_API_KEY` *(opsional tapi disarankan untuk AI Tutor & AI Game Studio)*
   - `DATABASE_URL` *(atau `POSTGRES_URL` dari Neon / Supabase / Vercel Postgres agar data tersimpan permanen lintas sesi)*
   - `APP_URL` *(isi dengan domain Vercel Anda, misalnya `https://cendekia-lms.vercel.app`)*
5. Klik **Deploy**.

### Cara B: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add GEMINI_API_KEY
vercel env add DATABASE_URL
vercel --prod
```

## 3. Wajib untuk Login Google (Firebase Auth)
Jika menggunakan **Masuk dengan Google** di domain Vercel:
1. Buka **Firebase Console → Authentication → Settings → Authorized domains**.
2. Tambahkan domain Vercel Anda (misalnya `nama-proyek.vercel.app` dan custom domain jika ada).

## 4. Verifikasi Deployment
Setelah deploy selesai, buka `https://<domain-anda>.vercel.app/api/health` untuk memastikan respons:
```json
{ "ok": true, "runtime": "vercel-serverless" }
```

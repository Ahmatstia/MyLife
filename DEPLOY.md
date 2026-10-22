# Deployment — Personal Progress OS (MyLife V2.0)

## Kebutuhan Sistem & Arsitektur
- **Runtime**: Node.js 22 LTS
- **Database**: **PostgreSQL 15+** (Supabase connection pooler / direct PostgreSQL instance). SQLite tidak lagi didukung untuk domain Habits V2 karena membutuhkan transaksi ACID, row-level advisory lock (`pg_advisory_xact_lock`), dan constraint check.
- **Reverse Proxy**: Nginx / Caddy / Cloudflare / Vercel.

---

## Konfigurasi Environment Variables (`.env`)

Pastikan variabel-variabel berikut telah dikonfigurasi di lingkungan produksi:

```env
# 1. Database (PostgreSQL)
DATABASE_URL="postgresql://user:pass@pooler-host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@direct-host:5432/postgres"

# 2. Autentikasi
AUTH_SECRET="<generate 64-character hex: openssl rand -hex 32>"
AUTH_ACCESS_CODE="<passphrase-kuat-anda>"

# 3. Kunci Enkripsi Habits V2 (AES-256-GCM) - WAJIB
# Digunakan untuk enkripsi catatan pribadi, lokasi, dan note masa depan
HABITS_ENC_KEY="<generate 64-character hex: openssl rand -hex 32>"

# 4. Feature Flag Habits V2
HABITS_V2="1"
NEXT_PUBLIC_HABITS_V2="1"

# 5. Cron & Integrasi Eksternal
CRON_SECRET="<secret-token-untuk-panggilan-cron>"
TELEGRAM_BOT_TOKEN="<token-bot-telegram>"
TELEGRAM_CHAT_ID="<chat-id-tujuan>"
APP_URL="https://app.anda.com"
```

---

## Langkah Deployment

### 1. Build & Database Setup
```bash
git pull origin main
npm ci
npx prisma generate
npm run build
```

### 2. Migrasi Data & Skema
Skema database menggunakan PostgreSQL DDL idempotent:
```bash
# Migrasikan relasi dan tabel Habits V2
npx tsx scripts/habits-phase5-migrate.ts

# Jalankan migrasi data kebiasaan lama (Jalur A)
npx tsx scripts/habits-legacy-migrate.ts --mode=A --execute
```

---

## Penjadwal Cron (Scheduler Tick)

Habits V2 menggunakan cron worker untuk mengevaluasi check-in yang jatuh tempo, mengirim pengingat Telegram/in-app, dan memproses jendela waktu.

Jadwalkan cron job setiap **5 atau 10 menit**:
```bash
# Contoh cron curl:
*/10 * * * * curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://app.anda.com/api/cron/reminder
```

---

## Smoke Test Pascarilis
1. Buka `/habits` → Memuat antarmuka Habits V2 (Break & Build Dashboard).
2. Buka `/today` → Widget *Evaluasi Kebiasaan Tertunda* tampil secara responsif.
3. Buat kebiasaan baru (Break & Build) → Berhasil tersimpan dengan enkripsi aktif di DB.
4. Uji `DELETE /api/tracked-habits/[id]` → Modal Arsip / Hapus Permanen berjalan mulus.
5. Jalankan `npm run test` atau `npx vitest run tests/habits/` → 100% lulus.
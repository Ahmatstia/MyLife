# Audit Fitur Habits — Implementasi Saat Ini vs `mylife-habits-feature-design.md`

| | |
|---|---|
| **Tanggal audit** | 10 Oktober 2026 |
| **Pembanding** | `mylife-habits-feature-design.md` v0.1 (target) vs kode di repo (kondisi nyata) |
| **Metode** | Membaca desain penuh, `prisma/schema.prisma`, migrasi, `habit.service.ts`, `habit.schema.ts`, `habit.repository.ts`, API route, UI, infrastruktur cron/notifikasi, dan titik keterkaitan fitur lain. Tidak ada kode yang diubah. |
| **Batasan** | File UI (`HabitCard`, `CheckInModal`, `HabitFormModal`, `HabitsManager`) hanya diperiksa ukuran dan perannya, bukan baris per baris. Halaman detail `habits/[id]` kosong/tidak terbaca (lihat 2.4). |

---

## 1. Kesimpulan Singkat

**Penilaian Anda benar: fitur sekarang tidak dapat dipertahankan sebagai fondasi.** Ia adalah *habit tracker + streak counter* biasa. Desain baru adalah *sistem pengubah perilaku*. Perbedaannya bukan sekadar penambahan fitur, tetapi **model data dan sumber kebenarannya berbeda**.

| Aspek | Sekarang | Desain baru | Verdict |
|---|---|---|---|
| Sumber kebenaran | `HabitLog` per hari + `HabitStreak` yang di-*update* langsung | `habit_events` append-only; streak/statistik **turunan** | **Ganti** |
| Pembatas hari | Tanggal kalender UTC | Jendela check-in per kebiasaan (`window_start/end`, zona waktu) | **Ganti** |
| Check-in harian jam 06:00 | Hanya string `checkInTime` — **tidak ada yang menjalankannya** | Scheduler `next_checkin_at` + outbox | **Bangun baru** |
| Break vs Build | `type: GOOD/BAD`, kolom sama untuk keduanya | `kind` + profil terpisah, mode Abstain/Reduce | **Ganti** |
| Terpeleset | `isSuccess=false` → streak 0 | Lapse/Slip/Relapse + debrief + metrik pemulihan | **Ganti** |
| SOS, pemicu, jika–maka, insight | Tidak ada | Inti Fase 2 & 4 | **Bangun baru** |
| Privasi & keselamatan | Tidak ada | Syarat awal | **Bangun baru** |

Yang bisa dipakai ulang hanya: relasi `User`, `Area`, pola layanan→repository→route, auth (`requireCurrentUser`/`requireUserId`), dan kerangka halaman `/habits` di Sidebar.

---

## 2. Temuan Audit pada Implementasi Saat Ini

### 2.1 Gambaran kode yang ada
- **Prisma** ([schema.prisma](file:///d:/IT/Software%20Engineer/web/MyLife/prisma/schema.prisma#L685-L799)): `Habit`, `HabitTask`, `HabitPhase`, `HabitLog`, `HabitStreak`; enum `HabitType {GOOD,BAD}`, `HabitDifficulty`. ID `cuid()` (string), bukan UUID.
- **Layanan** ([habit.service.ts](file:///d:/IT/Software%20Engineer/web/MyLife/src/services/habit.service.ts)): CRUD, fase, tugas, `checkInHabit`, statistik 365 hari.
- **API**: `/api/habits`, `/[id]`, `/[id]/log`, `/[id]/tasks`, `/[id]/phases` (+ sub-ID).
- **UI**: `HabitsManager`, `HabitCard`, `HabitFormModal`, `CheckInModal`. Halaman `[id]` (`page.tsx`, `HabitDetailClient.tsx`) tampak kosong.
- **Tes**: tidak ada satu pun tes untuk habits di folder `tests/`.

### 2.2 Cacat fungsional & desain (berdampak langsung pada kegagalan yang Anda rasakan)

| # | Temuan | Bukti | Tingkat |
|---|---|---|---|
| A1 | **Tidak ada check-in otomatis jam tertentu.** `checkInTime` hanya disimpan; tidak ada scheduler, notifikasi, atau pembuatan check-in `PENDING`. Ide inti Anda ("sistem mengecek harian jam 06:00") **tidak berjalan**. | `Habit.checkInTime String`; satu-satunya cron adalah `/api/cron/reminder` untuk task/fokus/review, tanpa kata "habit" | **Kritis** |
| A2 | **Streak disimpan sebagai angka yang dimutasi** (`incrementStreak`, `breakStreak`). Tidak bisa dihitung ulang; edit/backfill/hapus log merusak data. | `updateStreakAfterCheckIn` | **Kritis** |
| A3 | **Check-in hanya benar jika "kemarin" ada log sukses.** Hari terlewat otomatis memulai streak baru (=1), tanpa status "belum dikonfirmasi". Lupa check-in diperlakukan seperti gagal. | baris ~265–285 | **Tinggi** |
| A4 | **Tidak ada konsep zona waktu.** `normalizeDate` memakai UTC, sementara `todayNormalized()` mencampur `getFullYear()/getMonth()/getDate()` (waktu lokal server) dengan `Date.UTC` → "hari ini" bisa salah satu hari di server berzona waktu ≠ UTC. `UserPreference.timezone` sudah ada tetapi **tidak dipakai**. | `todayNormalized()` | **Tinggi** |
| A5 | **Bahasa pesan melanggar prinsip desain.** Klaim medis/ilmiah tegas: "otak sedang rewiring", "Kortisol mulai stabil", "withdrawal terberat 72 jam", "threshold perubahan kebiasaan permanen" pada 90 hari. Desain §14.3 melarang klaim medis dan mitos durasi (§2 #8). | `buildMotivationalMessage` | **Tinggi** (risiko etis) |
| A6 | **"Gagal" memutus semuanya**, tidak ada metrik pemulihan (total hari bersih, clean rate, dorongan dilawan). Streak terbaik dihitung dari baris `HabitStreak` historis, rapuh bila baris tidak lengkap. | `getHabitStats` | **Tinggi** |
| A7 | **Fase (`HabitPhase`) berbasis `targetDays` dari streak** untuk BAD habit — otomatis menuntaskan fase saat streak mencapai target. Ini model "gamifikasi hitung hari" yang bertentangan dengan Stage of Change (heuristik, disarankan sistem, dikonfirmasi pengguna). | `updatePhaseProgress` | Sedang |
| A8 | **Tidak ada rencana berhenti**: hanya `triggerNotes`, `replacementHabit`, `whyQuit` sebagai teks bebas tunggal. Tidak ada pemicu terstruktur, rencana jika–maka, analisis imbalan. | `createHabitSchema` | Sedang |
| A9 | **Race condition**: `upsertHabitLog` + update streak tidak dalam satu transaksi dan tanpa kunci; dua permintaan bersamaan bisa menggandakan/membuat streak keliru. | `checkInHabit` | Sedang |
| A10 | **Tidak ada tes** untuk logika streak/tanggal, area paling rawan bug. | `tests/` | Sedang |
| A11 | **Tidak ada idempotensi, rate-limit, atau pencegahan IDOR eksplisit pada sub-resource** (`editHabitPhase`, `updateHabitPhaseRecord(phaseId, habitId)` memverifikasi habit milik user, tetapi `HabitPhase` tidak punya `userId`). | schema/service | Rendah–Sedang |
| A12 | **Data habits tidak ikut ekspor/hapus** — tidak ada referensi "habit" di `data-export.service.ts`. Desain §14.1 mewajibkan ekspor & hapus permanen. | pencarian kode | Sedang |
| A13 | `HabitTask` (kategori ACTION/BARRIER/REPLACEMENT/PROTOCOL) adalah gabungan dua konsep berbeda di desain baru (pengganti, friksi lingkungan, aksi pengganti); tidak punya padanan langsung. | schema | Info |

---

## 3. Analisis Kesenjangan (Gap) per Bagian Desain

Legenda: ✅ ada & sesuai · 🟡 ada sebagian/perlu ubah · ❌ belum ada

### 3.1 Konsep & fitur Break (desain §6)
| Kode | Fitur | Status | Catatan |
|---|---|---|---|
| F-B1 | Check-in harian (jendela, `PENDING`, backfill 72 jam, `UNCONFIRMED`) | ❌ | Ada pencatatan manual per tanggal, bukan jendela |
| F-B2 | Timer live, streak, clean rate, total hari bersih, uang/waktu hemat, kalender | 🟡 | Streak & heatmap 90 hari ada; sisanya tidak |
| F-B3 | SOS urge surfing | ❌ | |
| F-B4 | Catat terpeleset + debrief + modal pemulihan | 🟡 | `isSuccess=false` + `relapseTrigger` teks. Tanpa SLIP/RELAPSE, debrief |
| F-B5 | Pemicu terstruktur + rencana jika–maka | ❌ | |
| F-B6 | Insight berbasis aturan | ❌ | |
| F-B7 | Pengingat cerdas | ❌ | |
| F-B8 | Mode Reduce | ❌ | |
| F-B9 | Aturan & deteksi kambuh | ❌ | |
| F-B10 | Kontak kepercayaan, sumber bantuan, layar keselamatan | ❌ | |

### 3.2 Fitur Build (desain §7)
| Kode | Status | Catatan |
|---|---|---|
| F-U1 Tiny Habit (jangkar–perilaku–perayaan) | 🟡 | `cue`/`reward` ada, tanpa jangkar/versi tiny-standard-stretch |
| F-U2 Tiga tingkat | ❌ | |
| F-U3 Jadwal fleksibel + hari istirahat | ❌ | Sekarang selalu harian |
| F-U4 Konsistensi 30 hari, streak tahan banting | ❌ | Hanya streak ketat |
| F-U5 "Jangan lewatkan dua kali" | ❌ | |
| F-U6 Survei otomatisitas | ❌ | |
| F-U7 Perayaan | 🟡 | Ada pesan statis |
| F-U8 Kebiasaan pengganti (Build↔Break) | 🟡 | `replacementHabit` hanya teks, bukan relasi |
| F-U9 Identitas | ❌ | |
| F-U10 Integrasi Goal/Fokus/Beranda | ❌ | Goal punya `type=HABIT` tetapi tidak ada tautan ke `Habit` |

### 3.3 Model data (desain §10)
| Desain | Sekarang | Aksi |
|---|---|---|
| `habits` (`kind`, `mode`, `stage`, `timezone`, `checkin_local_time`, `started_at`, `current_window_start`, `next_checkin_at`, `privacy_level`, `goal_id`, `display_alias`) | `Habit` tanpa semuanya kecuali `checkInTime` (string) | **Migrasi besar** |
| `habit_break_profiles`, `habit_build_profiles` | Kolom dicampur di `Habit` | **Tabel baru**, kolom lama dipindah/dibuang |
| `habit_events` | Tidak ada | **Baru** (menggantikan `HabitLog`) |
| `habit_checkins` | Tidak ada | **Baru** |
| `habit_stats` (cache) | `HabitStreak` (mutasi) | **Ganti** |
| `triggers`, `habit_triggers`, `coping_plans`, `habit_event_triggers` | Tidak ada | **Baru** |
| `habit_milestones`, `habit_reminders`, `automaticity_surveys`, `habit_reflections`, `support_resources` | Tidak ada | **Baru** |
| `notification_outbox` | Tidak ada (ada `Notification` untuk in-app) | **Baru/adaptasi** (lihat 5.2) |
| `HabitPhase` | Ada | **Hapus/ganti** oleh `stage` (heuristik transisi §8.7) |
| `HabitTask` | Ada | Petakan ke `coping_plans`/`environment_checklist`, atau hapus |

### 3.4 API (desain §11)
Desain: `/api/v1/...` ber-versi, format error terstandar (422/404/403/409/429), `Idempotency-Key`, endpoint dashboard/events/checkins/insights/triggers/coping-plans/reminders/export. Sekarang: `/api/habits/...` tanpa versi, `{ success, error }`, tanpa idempotensi, tidak ada endpoint events/checkins/dashboard/insights.
**Catatan:** konvensi `/api/v1` bertentangan dengan seluruh API MyLife lain (`/api/goals`, dll.). Lihat keputusan K-3.

### 3.5 Scheduler & notifikasi (desain §9.3–9.4)
- Ada: `/api/cron/reminder` (dipanggil OS/PM2 tiap 5 menit, dilindungi `CRON_SECRET`), `reminder.service.ts` (sadar zona waktu & jam tenang), `notification.service.ts` (in-app), `external-notification.service.ts`, `telegram.service.ts`, `email.service.ts` (nodemailer).
- Belum ada: tabel `next_checkin_at`, `FOR UPDATE SKIP LOCKED`, outbox, dedupe, catch-up 14 jendela.
- **Peluang:** tick 5 menit yang sudah ada dapat memanggil `habitScheduler.tick()`; tidak perlu worker baru di Fase 1 (desain mengusulkan tick 60 dtk — cukup 5 menit dengan toleransi keterlambatan <2 menit dilonggarkan, lihat K-4).

### 3.6 Keselamatan, privasi, QA
- Privasi (§14): mode diskret, notifikasi netral, enkripsi kolom teks, log bersih — **belum ada**.
- Keselamatan (§14.3): kategori berisiko, `safety_ack_at`, `support_resources` — **belum ada**.
- QA (§15): invarian, 22 kasus uji — **0 tes habits**. Perlu `Clock` injeksi dan fungsi murni.

---

## 4. Penyesuaian yang Diperlukan (Rencana Perubahan)

### 4.1 Pemetaan perubahan
| Lapisan | Hapus / ganti | Tambah | Pertahankan |
|---|---|---|---|
| **Database** | `HabitLog`, `HabitStreak`, `HabitPhase`, kolom campuran `Habit`, enum `HabitType` | Semua tabel §10 (disesuaikan Prisma, lihat K-1) | `User`, `Area`, relasi `onDelete: Cascade` |
| **Domain murni** | `updateStreakAfterCheckIn`, `updatePhaseProgress`, `buildMotivationalMessage` | `WindowCalculator`, `StreakEngine`, `RelapseDetector`, `dailyLimit`, `Clock` | — |
| **Service** | Logika `checkInHabit` | `HabitService`, `EventService`, `CheckinService`, `StatsEngine`, `InsightEngine`, scheduler | Pola `requireUserId` |
| **API** | Route lama `/log`, `/phases` | events, checkins, dashboard, triggers, coping-plans, dll. | `requireCurrentUser`, `AuthorizationError` |
| **UI** | `CheckInModal`, `HabitFormModal` (satu form datar) | Wizard Break (10 langkah), wizard Build, dashboard Break/Build, SOS, debrief, kalender | Rute `/habits`, entri Sidebar |
| **Notifikasi** | — | Outbox + adapter `NotificationPort` | Infrastruktur cron & channel yang ada |
| **Tes** | — | Unit (fungsi murni), integrasi (DB), IDOR, kontrak | Vitest, `tests/test-db.ts` |

### 4.2 Strategi data lama
Data lama hanya berupa log harian + streak. Tidak ada riwayat yang kompleks, jadi dua opsi:

| Opsi | Isi | Risiko |
|---|---|---|
| **A. Migrasi** (disarankan bila sudah ada data pengguna nyata) | `Habit` → `habits` (`BAD`→`BREAK/ABSTAIN`, `GOOD`→`BUILD`); `isSuccess=false` → event `LAPSE`; `isSuccess=true` → check-in `CLEAN`/`DONE`; hitung ulang `habit_stats` dari event; `triggerNotes/whyQuit` → `why_reasons`/trigger kustom. Jam lama = jam check-in; zona waktu dari `UserPreference`. | Kualitas data lama rendah (tanpa status "belum dikonfirmasi"); streak hasil hitung ulang bisa berbeda dari yang tampil |
| **B. Reset bersih** (sederhana) | Arsipkan tabel lama (`legacy_*` atau ekspor JSON), mulai dari nol | Pengguna kehilangan riwayat |

Penting: karena Anda menganggap fitur lama gagal, **tanyakan dulu** apakah ada data yang perlu dipertahankan (Keputusan K-6).

### 4.3 Urutan kerja yang disarankan (selaras roadmap §16)
1. **Fase 0 (baru):** bekukan fitur lama (jangan tambah fitur), putuskan K-1…K-6, ekspor data lama.
2. **Fase 1 – Inti Break:** fungsi murni + tes → skema & migrasi → API events/check-in → scheduler (di cron yang ada) → UI dashboard/wizard ringkas.
3. **Fase 2 – Rencana & SOS + keselamatan.**
4. **Fase 3 – Build & Reduce.**
5. **Fase 4–5 – Insight, pengingat, privasi penuh, ekspor/hapus.**
6. Hapus kode & tabel lama setelah Fase 1 stabil.

---

## 5. Dampak pada Sistem & Fitur Lain

### 5.1 Ringkasan dampak
| Area | Dampak | Tingkat | Penjelasan |
|---|---|---|---|
| **User & Auth** | Tambah relasi; model lama dihapus | Rendah | `User` memuat `habits/habitTasks/habitLogs/habitStreaks`; perlu diganti. Semua query wajib `userId` |
| **UserPreference** | Dipakai ulang | Rendah | `timezone` jadi default zona waktu habit (K-5). Jam tenang (`quiet hours`) dapat dipakai notifikasi habit |
| **Area** | Relasi tetap | Rendah | `Habit.areaId` dipertahankan; jika tidak, kehilangan pengelompokan area |
| **Goals** | Tautan baru | Sedang | Desain: `goal_id` nullable. Saat ini `GoalType.HABIT` ada di `goal.schema`, `capture.schema`, `NewGoalButton`, `GoalActionsMenu`, `ai/tools/goal.tools.ts` tetapi **tidak terhubung ke `Habit`**. Perlu keputusan: apakah Goal bertipe HABIT otomatis menaut ke habit? Relasi `onDelete` harus `SetNull` |
| **Notifikasi / Reminder / Cron** | Tambah beban & jenis baru | **Tinggi** | Perlu `NotificationType` baru (mis. `HABIT_CHECKIN`, `HABIT_RISK`), cron menjalankan `habit tick`, kebijakan jam tenang dan batas harian harus **dibagi** dengan reminder task/fokus agar tidak spam |
| **External notif (Telegram/Email)** | Kanal bisa dipakai | Sedang | Mode privasi (notifikasi netral) wajib diterapkan pada **semua** kanal; Telegram/email tidak boleh memuat nama kebiasaan bila `privacy_level ≥ 1` |
| **Dashboard / Today** | Widget baru | Sedang | Desain F-U10: check-in tertunda tampil di beranda. `dashboard.service`/`today.service` perlu membaca `/checkins/pending` (tanpa kebocoran nama bila mode diskret) |
| **Insights / Analytics / Momentum / Progress** | Potensi tumpang tindih | Sedang | Saat ini mereka tidak membaca habit, jadi **tidak rusak**. Namun halaman Insights menyebut "catat kebiasaan" di teks; sebaiknya putuskan apakah momentum/skor harian ikut menghitung habit. Jangan masukkan `habit_events` sensitif ke analitik umum |
| **AI (Command / Chat / Tools)** | Isi data sensitif | **Tinggi** | Alat `createGoalTool` bisa membuat goal HABIT. Bila AI nantinya membaca habit, data kebiasaan buruk menjadi konteks LLM → bertentangan dengan §14.1 (analitik pihak ketiga). Disarankan **tidak** mengekspos habit ke AI sebelum ada kebijakan privasi |
| **Capture (inbox)** | Rendah | Rendah | Kategori `HABIT` pada capture hanya label; tidak ada konversi otomatis ke `Habit` |
| **Data Export / Hapus akun** | Perlu ditambah | **Tinggi** | `data-export.service` belum memuat habit; wajib untuk "hard delete tanpa sisa cache" |
| **Sidebar / Navigasi** | Kecil | Rendah | `/habits` tetap; sub-rute baru (dashboard, plan, SOS) |
| **Logging (`lib/logger`)** | Aturan baru | Sedang | Dilarang menulis `note`, `with_whom`, `location_label`, nama kebiasaan |
| **Tes yang ada (`idor.*`, `security.test`)** | Perlu diperluas | Sedang | Tambahkan skenario habit baru; tes yang menyebut tabel lama (jika ada) akan gagal |
| **Deploy (Docker, `DEPLOY.md`, `.github/workflows/ci.yml`)** | Scheduler & migrasi | Sedang | Migrasi destruktif perlu langkah backup; pastikan cron eksternal memanggil endpoint reminder (tick habit menumpang) |
| **Generated Prisma (`src/generated/prisma`)** | Dibuat ulang | Rendah | Jalankan `prisma generate`; konstanta `SCHEMA_VERSION` di `src/lib/prisma.ts` (`cr006-habit-tasks-v2`) perlu dinaikkan |

### 5.2 Ketidakcocokan stack antara desain dan MyLife
Desain bersifat *agnostik stack*; berikut penyesuaiannya terhadap kondisi nyata:

| Desain | MyLife nyata | Penyesuaian |
|---|---|---|
| UUID `gen_random_uuid()` | `cuid()` string | Pakai `cuid()` agar konsisten |
| `TIMESTAMPTZ`, `TIME`, array, `jsonb`, enum PG | Prisma + PostgreSQL (dengan `@prisma/adapter-better-sqlite3` juga terpasang) | **Cek apakah tes/dev memakai SQLite**: `FOR UPDATE SKIP LOCKED`, array (`halt TEXT[]`), indeks parsial dan advisory lock **tidak tersedia di SQLite**. Gunakan `Json`/tabel relasi, atau pastikan dev & CI memakai PostgreSQL |
| `FOR UPDATE SKIP LOCKED`, `pg_advisory_xact_lock` | Prisma tidak punya API langsung | Gunakan `$queryRaw` di repository tersebut |
| Indeks parsial, `CHECK` | Prisma tidak mendukung deklaratif | Migrasi SQL manual (sudah ada pola ini di `scripts/setup-db-constraints.ts`) |
| Worker terpisah, tick 60 dtk, pg-boss/BullMQ | Next.js + endpoint cron OS/PM2 tiap 5 menit | Tick 5 menit di endpoint cron; **tidak perlu** pg-boss/Redis di Fase 1 |
| Web Push (VAPID) + service worker | Tidak ada; ada in-app, Telegram, email | Fase 1 pakai kanal yang ada; Web Push ditunda (K-2) |
| Luxon / `Temporal` | Tidak ada dependensi tanggal; kode memakai `Intl.DateTimeFormat` | Tambah `luxon` atau pakai `Intl` secara konsisten; **jangan** memakai `getFullYear()` lokal |
| `/api/v1/...` | `/api/<resource>` | Ikuti konvensi MyLife (K-3) |
| Service worker offline queue + `Idempotency-Key` | Tidak ada | Tunda ke Fase 5 |
| `users(id)` UUID | `User.id` cuid | Sesuaikan FK |

---

## 6. Risiko Utama Jika Dilanjutkan

| Risiko | Penjelasan | Mitigasi |
|---|---|---|
| Migrasi destruktif | Menghapus `HabitLog/Streak/Phase` | Ekspor + opsi A/B (4.2), jalankan di cabang terpisah |
| Bug zona waktu/DST | Sudah ada bug di `todayNormalized()` | Fungsi murni + `Clock`, uji T-04/T-05 |
| Beban cron | Satu tick memproses banyak habit & reminder | Batas 200/habit per tick, `SKIP LOCKED`, indeks |
| Pembengkakan lingkup | Desain sangat luas (6 fase) | Kerjakan Fase 1 saja dulu, rilis, evaluasi |
| Sensitivitas data | Kebiasaan buruk = data sensitif | Privasi sebagai syarat awal, bukan fase akhir |
| Ketergantungan SQLite vs PostgreSQL | Fitur desain butuh PG | Putuskan K-1 sebelum menulis skema |
| Regresi tim/pengguna lama | UI lama diganti total | Feature flag, hapus kode lama setelah Fase 1 |

---

## 7. Keputusan yang Perlu Anda Ambil (sebelum implementasi)

| # | Keputusan | Rekomendasi |
|---|---|---|
| K-1 | **Database target**: PostgreSQL saja (termasuk dev/CI), atau tetap mendukung SQLite? | PostgreSQL saja untuk habits |
| K-2 | **Kanal notifikasi Fase 1**: in-app + Telegram + email yang sudah ada, atau tambah Web Push? | Pakai yang ada dahulu |
| K-3 | **Penamaan API**: `/api/habits/...` (konsisten) atau `/api/v1/...` (sesuai desain)? | `/api/habits/...`; versi bila memang perlu publik |
| K-4 | **Presisi scheduler**: terima keterlambatan hingga 5 menit (cron sekarang) atau butuh tick 60 detik? | Terima 5 menit |
| K-5 | **Zona waktu**: default dari `UserPreference.timezone`, bisa dioverride per habit? | Ya |
| K-6 | **Data lama**: migrasi (A) atau reset bersih (B)? Apakah sudah ada pengguna dengan data nyata? | Bergantung data; B bila hanya data uji |
| K-7 | **Hubungan dengan Goal bertipe HABIT** dan Insights/Momentum: ditautkan atau dipisah? | Tautan opsional via `goal_id`; belum masuk skor momentum |
| K-8 | **Paparan ke AI**: izinkan atau larang AI membaca habit? | Larang sampai kebijakan privasi siap |
| K-9 | Keputusan produk dari desain §17.2 (kategori berisiko, kebijakan streak, tingkat gamifikasi) | Ikuti rekomendasi desain |

---

## 8. Langkah Berikutnya yang Disarankan
1. Jawab K-1 s.d. K-9 (terutama K-1, K-6).
2. Saya dapat membuat **rencana implementasi Fase 1** terperinci (skema Prisma final, daftar migrasi, kontrak API, urutan tes).
3. Mulai dari fungsi murni `WindowCalculator` + `StreakEngine` beserta tes unit sebelum menyentuh DB/UI.

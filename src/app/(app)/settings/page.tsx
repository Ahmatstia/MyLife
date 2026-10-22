import { requirePageUser } from "@/lib/auth";
import { getUserAccountStats } from "@/services/user.service";
import { getUserPreference } from "@/services/user-preference.service";
import LogoutButton from "@/app/components/LogoutButton";
import { Icon } from "@/app/components/ui/Icon";
import { UserPreferenceControls } from "./UserPreferenceControls";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

export default async function SettingsPage() {
  const user = await requirePageUser();

  const [stats, preference] = await Promise.all([
    getUserAccountStats(user.id),
    getUserPreference(user.id),
  ]);
  const { goalCount, taskCount, sessionCount } = stats;

  const initials = (user.name || "AP")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Header Layar & Ringkasan */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-teal-500/15 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-teal-400/80">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 font-semibold text-teal-300">
              Pengaturan &amp; Personalisasi
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">Preferensi Sistem</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pengaturan Akun &amp; Sistem
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Kelola preferensi antarmuka kerja, ritme produktivitas, integrasi notifikasi, dan pencadangan data Anda.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[#0d1b20] rounded-xl border border-teal-500/15 shadow-sm">
            <span className="text-teal-400 text-sm">💾</span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 leading-none">Penyimpanan</span>
              <span className="font-mono text-xs font-semibold text-zinc-200">PostgreSQL Cloud &amp; Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Kartu Profil & Jejak Data */}
      <section className="rounded-3xl border border-teal-500/15 bg-[#0d1b20]/90 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Kolom Kiri: Identitas Pengguna */}
          <div className="lg:col-span-5 flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-[#14272e] border-2 border-teal-500/30 flex items-center justify-center shadow-lg">
                <span className="font-bold text-lg font-mono text-teal-300">{initials}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-400 rounded-full ring-2 ring-[#0d1b20]" title="Online" />
            </div>

            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{user.name || "Akun Anda"}</h2>
              <p className="text-xs text-zinc-400 truncate font-mono">{user.email}</p>
              
              <div className="pt-1.5 flex flex-col gap-1">
                <span className="inline-flex items-center text-[10px] font-semibold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-lg w-fit border border-teal-500/20">
                  Pengguna Terverifikasi
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>📅</span>
                  Akun aktif sejak {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Mini Bento Metrik Data */}
          <div className="lg:col-span-7 rounded-2xl border border-teal-500/15 bg-[#081013]/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Jejak Data Produktivitas</span>
              <span className="text-[10px] text-teal-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span> Sinkron Lokal
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Metrik 1: Target */}
              <div className="rounded-xl border border-teal-500/15 bg-[#0d1b20] p-3 shadow-xs hover:border-teal-500/30 transition-colors">
                <div className="flex items-center justify-between text-teal-400 mb-2">
                  <Icon name="flag" size={16} />
                  <span className="font-mono text-[9px] text-zinc-500">TARGET</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{goalCount} Target</div>
                <div className="text-[11px] text-teal-300/80 truncate mt-1">Peta Perjalanan Aktif</div>
              </div>

              {/* Metrik 2: Tasks */}
              <div className="rounded-xl border border-teal-500/15 bg-[#0d1b20] p-3 shadow-xs hover:border-teal-500/30 transition-colors">
                <div className="flex items-center justify-between text-teal-300 mb-2">
                  <Icon name="check" size={16} />
                  <span className="font-mono text-[9px] text-zinc-500">TASKS</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{taskCount} Tugas</div>
                <div className="text-[11px] text-teal-300/80 truncate mt-1">Total Eksekusi</div>
              </div>

              {/* Metrik 3: Sesi Fokus */}
              <div className="rounded-xl border border-teal-500/15 bg-[#0d1b20] p-3 shadow-xs hover:border-teal-500/30 transition-colors">
                <div className="flex items-center justify-between text-teal-400 mb-2">
                  <Icon name="clock" size={16} />
                  <span className="font-mono text-[9px] text-zinc-500">LOGS</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{sessionCount} Sesi</div>
                <div className="text-[11px] text-teal-300/80 truncate mt-1">Deep Work Tercatat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Kontrol Preferensi & Saluran Eksternal */}
      <UserPreferenceControls initialPref={preference} />

      {/* 4. Kedaulatan Data (Data Sovereignty) */}
      <section className="rounded-3xl border border-teal-500/15 bg-[#0d1b20]/90 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
              <span>🛡️</span>
              <span>Kedaulatan Data Pribadi • Bebas Kunci Vendor</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ekspor &amp; Cadangan Mandiri Seluruh Data
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Anda memegang kendali penuh atas data Anda. Unduh salinan lengkap seluruh Target, Tugas, Sesi Fokus, Catatan Cepat, Agenda, dan Riwayat Evaluasi Anda dalam format file JSON standar kapan saja.
            </p>
          </div>

          <a
            href="/api/settings/export"
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 px-5 py-3 text-xs font-semibold text-teal-200 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <span>📥</span>
            <span>Unduh Cadangan JSON</span>
          </a>
        </div>
      </section>

      {/* 5. Zona Akun & Keluar Sesi */}
      <section className="rounded-3xl border border-rose-500/20 bg-rose-950/15 p-6 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-400">
            <span>⚠️</span>
            <span>Zona Keamanan Akun</span>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">Akhiri Sesi Kerja</h2>
          <p className="text-xs text-zinc-400">Keluar dari akun Anda di perangkat ini dan amankan sesi lokal.</p>
        </div>
        <LogoutButton />
      </section>
    </div>
  );
}
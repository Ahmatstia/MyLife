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
      {/* 1. Header Layar & Telemetri */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <span>PENGATURAN & PERSONALISASI</span>
            <span className="text-white/20">{"//"}</span>
            <span className="text-[#d0bcff]">SISTEM MYLIFE OS v4.2</span>
            <span className="text-white/20">{"//"}</span>
            <div className="flex items-center gap-1.5 rounded-full bg-[#4edea3]/10 px-2 py-0.5 text-[#4edea3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
              <span className="font-semibold">STATUS: ENKRIPSI LOKAL AKTIF</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Pengaturan Akun & Sistem
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Kelola identitas profil, preferensi tema kerja, integrasi pengingat eksternal, dan kedaulatan data pribadi Anda.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#131825] rounded-xl border border-white/[0.08] shadow-lg">
            <span className="text-[#8B5CF6]">💾</span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#64748B] leading-none">PENYIMPANAN</span>
              <span className="font-mono text-xs font-semibold text-white">PostgreSQL Cloud &amp; Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Kartu Profil & Jejak Data */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Kolom Kiri: Identitas Pengguna */}
          <div className="lg:col-span-5 flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-[#1A2133] border-2 border-[#8B5CF6]/50 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <span className="font-bold text-lg font-mono text-[#d0bcff]">{initials}</span>
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4edea3] rounded-full ring-2 ring-[#131825]" title="Online" />
            </div>

            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{user.name || "Akun Anda"}</h2>
              <p className="text-xs text-[#94A3B8] truncate font-mono">{user.email}</p>
              
              <div className="pt-1.5 flex flex-col gap-1.5">
                <span className="inline-flex items-center font-mono text-[10px] font-bold text-[#c0c1ff] bg-[#3131c0]/20 px-2 py-0.5 rounded w-fit border border-[#c0c1ff]/20">
                  PENGGUNA UTAMA // DEV & PERSONAL PROGRESS
                </span>
                <span className="font-mono text-[11px] text-[#64748B] flex items-center gap-1">
                  <span>📅</span>
                  Akun aktif sejak {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Mini Bento Metrik Data */}
          <div className="lg:col-span-7 rounded-xl border border-white/[0.06] bg-[#0B0D13]/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#64748B]">JEJAK DATA PRIBADI ANDA</span>
              <span className="font-mono text-[10px] text-[#4edea3] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span> SINKRON LOKAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Metrik 1: Target */}
              <div className="rounded-xl border border-white/[0.06] bg-[#131825] p-3 shadow-sm hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-[#F59E0B] mb-2">
                  <Icon name="flag" size={16} />
                  <span className="font-mono text-[9px] text-[#64748B]">TARGET</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{goalCount} Target</div>
                <div className="text-[11px] text-[#F59E0B] truncate mt-1">Peta Perjalanan Aktif</div>
              </div>

              {/* Metrik 2: Tasks */}
              <div className="rounded-xl border border-white/[0.06] bg-[#131825] p-3 shadow-sm hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-[#4edea3] mb-2">
                  <Icon name="check" size={16} />
                  <span className="font-mono text-[9px] text-[#64748B]">TASKS</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{taskCount} Tugas</div>
                <div className="text-[11px] text-[#4edea3] truncate mt-1">Total Eksekusi</div>
              </div>

              {/* Metrik 3: Sesi Fokus */}
              <div className="rounded-xl border border-white/[0.06] bg-[#131825] p-3 shadow-sm hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between text-[#d0bcff] mb-2">
                  <Icon name="clock" size={16} />
                  <span className="font-mono text-[9px] text-[#64748B]">LOGS</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">{sessionCount} Sesi</div>
                <div className="text-[11px] text-[#d0bcff] truncate mt-1">Deep Work Tercatat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Kontrol Preferensi & Saluran Eksternal */}
      <UserPreferenceControls initialPref={preference} />

      {/* 4. Kedaulatan Data (Data Sovereignty) */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#131825] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#c0c1ff]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#c0c1ff]">
              <span>🛡️</span>
              <span>KEDAULATAN DATA PRIBADI // LOCAL-FIRST & ZERO VENDOR LOCK-IN</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ekspor & Cadangan Mandiri Seluruh Data
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Anda memegang kendali penuh atas data Anda. Unduh salinan lengkap seluruh Target, Tugas, Sesi Fokus, Catatan Cepat, Kalender, dan Riwayat Evaluasi Anda dalam format file JSON standar kapan saja.
            </p>
          </div>

          <a
            href="/api/settings/export"
            download
            className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-5 py-3 text-xs font-bold text-white shadow-lg transition-all active:scale-98 shrink-0 hover:border-[#8B5CF6]/50"
          >
            <span>📥</span>
            <span>Unduh Cadangan JSON</span>
          </a>
        </div>
      </section>

      {/* 5. Zona Akun & Keluar Sesi */}
      <section className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-rose-400">
            <span>⚠️</span>
            <span>ZONA KEAMANAN AKUN</span>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">Akhiri Sesi Kerja</h2>
          <p className="text-xs text-[#94A3B8]">Keluar dari akun Anda di perangkat ini dan kunci sesi lokal.</p>
        </div>
        <LogoutButton />
      </section>
    </div>
  );
}
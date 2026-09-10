"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  USER_NEEDS_GUIDES,
  MENU_EXPLANATIONS,
  FEATURE_CONNECTIONS,
  DAILY_WORKFLOW,
  type UserNeedGuide,
} from "./tutorial-data";

type TabMode = "needs" | "menus" | "connections" | "workflow";

export function InteractiveTutorialExperience() {
  const [activeTab, setActiveTab] = useState<TabMode>("needs");
  const [selectedNeedId, setSelectedNeedId] = useState<string>("need-life-plan");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeNeed = useMemo<UserNeedGuide>(() => {
    return USER_NEEDS_GUIDES.find((n) => n.id === selectedNeedId) || USER_NEEDS_GUIDES[0];
  }, [selectedNeedId]);

  // Filtered menus for search with broad keyword matching
  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return MENU_EXPLANATIONS;
    const q = searchQuery.toLowerCase().trim();
    return MENU_EXPLANATIONS.filter(
      (m) =>
        m.menuName.toLowerCase().includes(q) ||
        m.badge.toLowerCase().includes(q) ||
        m.simpleExplanation.toLowerCase().includes(q) ||
        m.tips.toLowerCase().includes(q) ||
        m.whatYouCanDo.some((item) => item.toLowerCase().includes(q)) ||
        m.stepByStep.some((item) => item.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 pb-20">
      {/* ==================================================================== */}
      {/* HEADER HERO (RAMAH, BERSIH, MEMBANTU)                                */}
      {/* ==================================================================== */}
      <div className="border-b border-surface-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold mb-1.5">
                <span>💡</span> Panduan Praktis MyLife
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-surface-900 tracking-tight">
                Bagaimana MyLife Membantu Hidup Anda?
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-surface-600 max-w-2xl leading-relaxed">
                MyLife diciptakan sebagai sahabat setia untuk membantu Anda menata arah hidup, berhenti menunda pekerjaan, mengelola fokus tanpa stres, dan memastikan target impian Anda benar-benar terwujud satu per satu.
              </p>
            </div>

            <Link
              href="/today"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <span>Kembali ke Aplikasi</span>
              <span>→</span>
            </Link>
          </div>

          {/* Tab Navigation */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-150 pt-3.5">
            {[
              { id: "needs", label: "🎯 Saya Ingin Melakukan...", desc: "Pilih Niat & Dapatkan Solusi" },
              { id: "menus", label: "🧭 Kamus Lengkap Menu", desc: "Fungsi & Cara Pakai Tiap Fitur" },
              { id: "connections", label: "🔗 Cara Fitur Bekerja Sama", desc: "Hubungan Antar Fitur (A ke B)" },
              { id: "workflow", label: "☀️ Alur Kerja Harian Ideal", desc: "Dari Bangun Pagi s/d Akhir Pekan" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabMode)}
                className={`flex flex-col items-start px-4 py-2 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20"
                    : "bg-surface-100/80 border-surface-200 text-surface-600 hover:bg-surface-150 hover:text-surface-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-normal ${activeTab === tab.id ? "text-primary-100" : "text-surface-400"}`}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* ==================================================================== */}
        {/* TAB 1: PANDUAN BERDASARKAN KEBUTUHAN ANDA ("SAYA INGIN...")          */}
        {/* ==================================================================== */}
        {activeTab === "needs" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive List of Goals */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Pilih Apa yang Sedang Anda Rasakan atau Butuhkan:
                </span>
              </div>

              {USER_NEEDS_GUIDES.map((need) => {
                const isSelected = selectedNeedId === need.id;
                return (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => setSelectedNeedId(need.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-white border-primary-500 shadow-md ring-2 ring-primary-500/20"
                        : "bg-white/60 border-surface-200 hover:bg-white hover:border-surface-300"
                    }`}
                  >
                    <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-surface-100">
                      {need.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-xs font-bold leading-snug ${isSelected ? "text-primary-700" : "text-surface-800"}`}>
                        {need.userGoal}
                      </h3>
                      <p className="text-[11px] text-surface-500 mt-1 line-clamp-1">
                        Gunakan Menu: <span className="font-semibold text-surface-700">{need.recommendedFeature}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Detailed Solution Card */}
            <div className="lg:col-span-7">
              <div className="p-6 rounded-3xl bg-white border border-surface-200 shadow-sm sticky top-36">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-150 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-surface-100">
                      {activeNeed.icon}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                        Rekomendasi Menu Terbaik
                      </span>
                      <h2 className="text-base font-bold text-surface-900 mt-0.5">
                        {activeNeed.recommendedFeature}
                      </h2>
                    </div>
                  </div>

                  <Link
                    href={activeNeed.route}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm active:scale-95 flex items-center gap-1"
                  >
                    <span>Buka Fitur Ini</span>
                    <span>↗</span>
                  </Link>
                </div>

                {/* Masalah yang diselesaikan */}
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                  <h4 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>🛑</span>
                    <span>Masalah yang Sering Dialami:</span>
                  </h4>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    {activeNeed.problemSolved}
                  </p>
                </div>

                {/* Mengapa fitur ini */}
                <div className="mb-5">
                  <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Mengapa Fitur Ini Membantu Anda:</span>
                  </h4>
                  <p className="text-xs text-surface-700 leading-relaxed bg-surface-50 p-3 rounded-xl border border-surface-150">
                    {activeNeed.whyThisFeature}
                  </p>
                </div>

                {/* Langkah demi Langkah */}
                <div className="mb-5">
                  <h4 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🛠️</span>
                    <span>Langkah Mudah Menggunakannya:</span>
                  </h4>
                  <div className="space-y-2">
                    {activeNeed.howToSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-surface-700 bg-surface-50/50 p-2.5 rounded-xl border border-surface-100">
                        <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hubungan dengan fitur lain */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <h4 className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>🔗</span>
                    <span>Bagaimana Fitur Ini Terhubung dengan Menu Lain:</span>
                  </h4>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    {activeNeed.connectedTo}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: KAMUS SETIAP MENU (PENJELASAN RAMAH MANUSIA)                  */}
        {/* ==================================================================== */}
        {activeTab === "menus" && (
          <div>
            <div className="mb-6 max-w-xl">
              <label htmlFor="tutorial-search" className="block text-xs font-bold text-surface-700 mb-1.5">
                Cari Menu atau Kebutuhan Anda:
              </label>
              <input
                id="tutorial-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci (misal: fokus, jadwal, target, catatan kilat, pilar, evaluasi)..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-surface-300 bg-white text-surface-800 placeholder:text-surface-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 shadow-xs"
              />

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] font-semibold text-surface-400">Pencarian Cepat:</span>
                {["Hari Ini", "Fokus", "Kalender", "Target", "Proyek", "Pilar", "Kotak Masuk", "Refleksi"].map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => setSearchQuery(keyword)}
                    className="text-[10.5px] px-2.5 py-0.5 rounded-full bg-surface-100 hover:bg-primary-50 hover:text-primary-700 text-surface-600 border border-surface-200 transition-colors cursor-pointer"
                  >
                    {keyword}
                  </button>
                ))}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[10.5px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Reset ✕
                  </button>
                )}
              </div>
            </div>

            {filteredMenus.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-surface-200">
                <span className="text-3xl mb-2 block">🔍</span>
                <h3 className="text-sm font-bold text-surface-800">Menu Tidak Ditemukan</h3>
                <p className="text-xs text-surface-500 mt-1">
                  Tidak ada menu yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Coba gunakan kata lain seperti &quot;tugas&quot;, &quot;fokus&quot;, atau &quot;jadwal&quot;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredMenus.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border border-surface-200 shadow-xs flex flex-col justify-between hover:border-surface-300 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-surface-150 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-1.5 rounded-xl bg-surface-100">
                            {item.icon}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-surface-900">{item.menuName}</h3>
                            <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                              {item.badge}
                            </span>
                          </div>
                        </div>

                        <Link
                          href={item.route}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-surface-100 hover:bg-primary-600 hover:text-white text-surface-700 transition-all flex items-center gap-1"
                        >
                          <span>Buka</span>
                          <span>↗</span>
                        </Link>
                      </div>

                      <p className="text-xs text-surface-700 leading-relaxed mb-4">
                        {item.simpleExplanation}
                      </p>

                      {/* What you can do */}
                      <div className="mb-3.5">
                        <h4 className="text-[10.5px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">
                          Apa yang Bisa Anda Lakukan di Sini:
                        </h4>
                        <ul className="space-y-1.5 text-xs text-surface-600">
                          {item.whatYouCanDo.map((w, wIdx) => (
                            <li key={wIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span className="leading-relaxed">{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Step by step */}
                      <div className="mb-3 p-3 rounded-xl bg-surface-50/70 border border-surface-150">
                        <h4 className="text-[10.5px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                          Langkah Mudah Menggunakannya:
                        </h4>
                        <div className="space-y-1.5 text-xs text-surface-700">
                          {item.stepByStep.map((s, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-surface-150 mt-2">
                      <p className="text-[11px] text-surface-500 italic">
                        <span className="font-bold text-surface-700 not-italic">Tips Ramah: </span>
                        {item.tips}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: CARA FITUR SALING BEKERJA SAMA (HUBUNGAN TIMBAL BALIK)        */}
        {/* ==================================================================== */}
        {activeTab === "connections" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-950">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>💡</span>
                <span>Prinsip Penting: Semua Fitur di MyLife Bekerja Bersama untuk Anda</span>
              </h3>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Di MyLife, Anda tidak perlu khawatir mengisi data berulang-ulang. Semua fitur saling mengalirkan data secara otomatis. Saat Anda mencentang tugas selesai di meja kerja harian, kemajuan target impian Anda langsung bergerak maju. Saat Anda mencatat menit fokus, jurnal evaluasi akhir pekan Anda otomatis terisi. Pelajari 5 alur kerja sama utama di bawah ini:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {FEATURE_CONNECTIONS.map((conn) => (
                <div
                  key={conn.id}
                  className="p-5 rounded-2xl bg-white border border-surface-200 shadow-xs flex flex-col justify-between hover:border-surface-300 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-150 mb-3">
                      <span className="text-2xl">{conn.icon}</span>
                      <h3 className="text-sm font-bold text-surface-900">{conn.title}</h3>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 mb-4">
                      <span className="text-[11px] font-bold text-amber-900 block mb-0.5">
                        Analogi Sederhana:
                      </span>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {conn.analogy}
                      </p>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="p-2.5 rounded-lg bg-surface-50 border border-surface-150 text-xs">
                        <span className="font-bold text-surface-800 block text-[11px] mb-0.5">
                          1. {conn.step1.name}:
                        </span>
                        <span className="text-surface-600 leading-relaxed">{conn.step1.action}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-50 border border-surface-150 text-xs">
                        <span className="font-bold text-surface-800 block text-[11px] mb-0.5">
                          2. {conn.step2.name}:
                        </span>
                        <span className="text-surface-600 leading-relaxed">{conn.step2.action}</span>
                      </div>
                    </div>

                    <p className="text-xs text-surface-700 leading-relaxed mb-3">
                      <span className="font-bold text-surface-900">Manfaat untuk Anda: </span>
                      {conn.howTheyHelpYou}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-surface-150">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">
                      Contoh Nyata Sehari-hari:
                    </span>
                    <p className="text-xs font-medium text-surface-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                      {conn.practicalExample}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: ALUR KERJA HARIAN IDEAL (DARI BANGUN TIDUR S/D AKHIR PEKAN)   */}
        {/* ==================================================================== */}
        {activeTab === "workflow" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="text-center max-w-xl mx-auto mb-6">
              <h2 className="text-lg font-bold text-surface-900">
                Siklus Hari yang Tenang, Teratur, dan Produktif
              </h2>
              <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                Anda tidak perlu bingung kapan harus membuka menu apa. Ikuti ritme harian 4 langkah yang alami di bawah ini:
              </p>
            </div>

            <div className="space-y-4">
              {DAILY_WORKFLOW.map((wf, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-surface-200 shadow-xs flex flex-col sm:flex-row items-start gap-4 hover:border-surface-300 transition-all"
                >
                  <span className="text-3xl p-3 rounded-2xl bg-surface-100 shrink-0">
                    {wf.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
                        {wf.time}
                      </span>
                      <Link
                        href={wf.route}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
                      >
                        <span>Buka {wf.menuToOpen}</span>
                        <span>→</span>
                      </Link>
                    </div>

                    <h3 className="text-sm font-bold text-surface-900 mb-2">{wf.phaseName}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 text-xs">
                      <div className="p-3 rounded-xl bg-surface-50 border border-surface-150">
                        <span className="font-bold text-surface-700 block text-[11px] mb-0.5">
                          Kondisi yang Anda Rasakan:
                        </span>
                        <span className="text-surface-600 leading-relaxed">{wf.whatYouFeel}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                        <span className="font-bold text-emerald-800 block text-[11px] mb-0.5">
                          Tindakan Sederhana Anda:
                        </span>
                        <span className="text-emerald-900 font-medium leading-relaxed">{wf.whatYouShouldDo}</span>
                      </div>
                    </div>

                    <p className="text-xs text-surface-500 italic mt-2.5 flex items-center gap-1.5">
                      <span>💡</span>
                      <span>{wf.explanation}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

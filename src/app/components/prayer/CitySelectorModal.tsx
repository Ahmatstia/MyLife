"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  INDONESIAN_CITIES,
  IndonesianCity,
  findNearestCity,
  searchCities,
} from "@/lib/prayer/cities";

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: IndonesianCity;
  onSelectCity: (city: IndonesianCity) => void;
}

const POPULAR_CITY_IDS = [
  "jakarta",
  "surabaya",
  "bandung",
  "medan",
  "semarang",
  "makassar",
  "yogyakarta",
  "denpasar",
  "palembang",
  "balikpapan",
];

export function CitySelectorModal({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
}: CitySelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Filtered cities list
  const filteredCities = useMemo(() => {
    return searchCities(searchQuery);
  }, [searchQuery]);

  const handleClose = () => {
    setSearchQuery("");
    setGeoError(null);
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
        setGeoError(null);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  // GPS Geolocation Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Browser Anda tidak mendukung deteksi lokasi (Geolocation).");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude);
        onSelectCity(nearest);
        handleClose();
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Izin lokasi ditolak. Silakan pilih kota manual di daftar bawah.");
        } else {
          setGeoError("Gagal mendeteksi lokasi otomatis. Silakan cari nama kota.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-[#0d1b20] border border-slate-200 dark:border-teal-500/20 shadow-2xl flex flex-col max-h-[85vh] my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-[#10b981]/20 via-[#38bdf8]/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">location_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pilih Kota / Lokasi
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94a3b8]">
                Jadwal sholat & adzan disesuaikan otomatis dengan koordinat wilayah
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label="Tutup modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search & GPS Section */}
        <div className="p-6 pb-3 space-y-3 shrink-0">
          {/* GPS Auto-detect Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Mendeteksi Koordinat GPS...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">my_location</span>
                <span>Gunakan Lokasi GPS Saya Saat Ini</span>
              </>
            )}
          </button>

          {geoError && (
            <p className="text-xs text-rose-500 dark:text-rose-400 px-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">error</span>
              <span>{geoError}</span>
            </p>
          )}

          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 dark:text-[#94a3b8] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kota atau provinsi (cth: Bandung, Bali, Riau)..."
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#94a3b8]/60 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[16px]">clear</span>
              </button>
            )}
          </div>

          {/* Popular Cities Quick Pills */}
          {!searchQuery && (
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider mb-2">
                Kota Populer
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITY_IDS.map((id) => {
                  const city = INDONESIAN_CITIES.find((c) => c.id === id);
                  if (!city) return null;
                  const isSelected = city.id === selectedCity.id;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        onSelectCity(city);
                        onClose();
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-500 text-white shadow-xs font-semibold"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#cbd5e1] hover:bg-slate-200 dark:hover:bg-white/[0.12]"
                      }`}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable City List */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-1.5 divide-y divide-slate-100 dark:divide-white/[0.05]">
          <div className="text-[11px] font-semibold text-slate-400 dark:text-[#94a3b8] uppercase tracking-wider pb-1">
            Daftar Wilayah ({filteredCities.length})
          </div>

          {filteredCities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-[#94a3b8] space-y-2">
              <span className="material-symbols-outlined text-[36px] opacity-40">location_off</span>
              <p className="text-xs">Kota tidak ditemukan untuk pencarian &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            filteredCities.map((city) => {
              const isSelected = city.id === selectedCity.id;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelectCity(city);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all pt-2.5 ${
                    isSelected
                      ? "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.05] text-slate-700 dark:text-[#e2e2eb]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isSelected ? "text-emerald-500" : "text-slate-400 dark:text-[#94a3b8]"
                      }`}
                    >
                      {isSelected ? "check_circle" : "location_city"}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{city.name}</span>
                        {isSelected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-[#94a3b8] truncate">
                        {city.province}
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-[#94a3b8] shrink-0 ml-2">
                    {city.tzLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

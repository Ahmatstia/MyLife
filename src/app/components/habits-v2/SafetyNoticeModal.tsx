"use client";

import React, { useState, useEffect } from "react";

interface SupportResourceItem {
  id: string;
  name: string;
  contact: string;
  description?: string | null;
  category: string;
  sourceUrl?: string | null;
}

interface SafetyNoticeModalProps {
  isOpen: boolean;
  habitId?: string;
  category?: string | null;
  onClose: () => void;
  onAcknowledge: () => void;
}

export function SafetyNoticeModal({
  isOpen,
  habitId,
  category,
  onClose,
  onAcknowledge,
}: SafetyNoticeModalProps) {
  const [resources, setResources] = useState<SupportResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function fetchResources() {
      try {
        const res = await fetch("/api/support-resources?country=ID");
        const json = await res.json();
        if (!ignore && res.ok && json.success) {
          setResources(json.data || []);
        }
      } catch {
        // fallback silent
      } finally {
        if (!ignore) setLoadingResources(false);
      }
    }

    fetchResources();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmAck = async () => {
    if (habitId) {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/tracked-habits/${habitId}/safety/acknowledge`, {
          method: "POST",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Tidak dapat mengonfirmasi panduan keselamatan.");
        }
        onAcknowledge();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Dalam konteks wizard pembentukan habit baru
      onAcknowledge();
    }
  };

  return (
    <div
      id="safety-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-notice-title"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-amber-500/40 bg-[#16151f] p-6 text-white shadow-2xl shadow-amber-950/40 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xl font-bold">
              🛡️
            </span>
            <div>
              <h2 id="safety-notice-title" className="text-base font-bold text-white tracking-tight">
                Panduan Keselamatan & Kesehatan
              </h2>
              <p className="text-[11px] text-amber-300/80">
                Layar Pengantar Wajib Kategori Berisiko ({category || "Berisiko"})
              </p>
            </div>
          </div>
          <button
            id="safety-close-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Tutup modal"
          >
            ✕
          </button>
        </div>

        {/* Isi Panduan Keselamatan (§14.3) */}
        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2 text-rose-200">
            <h3 className="font-bold text-rose-100 flex items-center gap-2">
              <span>⚠️</span>
              <span>Peringatan Gejala Putus Zat (Withdrawal)</span>
            </h3>
            <p className="text-slate-200">
              Jika kebiasaan ini melibatkan konsumsi alkohol, zat adiktif, atau obat penenang tertentu, <strong>jangan berhenti secara mendadak tanpa konsultasi dokter</strong>. Gejala putus zat parah dapat membahayakan keselamatan jiwa dan memerlukan detoksifikasi di bawah pengawasan medis.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1.5 text-slate-300">
            <h3 className="font-bold text-amber-200 flex items-center gap-2">
              <span>ℹ️</span>
              <span>Aplikasi Bukan Pengganti Layanan Medis</span>
            </h3>
            <p>
              MyLife adalah perangkat pendukung pencatatan dan bukan penyedia diagnosis, terapi klinis, atau perawatan medis. Pemulihan dari kecanduan berat, judi, atau gangguan makan membutuhkan jejaring dukungan profesional.
            </p>
          </div>

          {/* Daftar Sumber Bantuan Terverifikasi */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Sumber Bantuan & Hotline Krisis Resmi (Indonesia):
            </span>

            {loadingResources ? (
              <div className="text-slate-500 text-xs py-3 text-center animate-pulse">
                Memuat daftar layanan bantuan terverifikasi...
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{res.name}</div>
                      {res.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{res.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        {res.contact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Footer Tombol Pengakuan Wajib */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Kamu harus mengonfirmasi panduan ini untuk dapat mengaktifkan kebiasaan.
          </p>
          <button
            id="safety-acknowledge-btn"
            type="button"
            disabled={submitting}
            onClick={handleConfirmAck}
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {submitting ? "Memproses..." : "Saya Mengerti & Mengakui Panduan Ini ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

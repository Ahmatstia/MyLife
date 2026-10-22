"use client";

import React, { useState } from "react";

interface DeleteHabitModalProps {
  habitId: string;
  habitName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function DeleteHabitModal({
  habitId,
  habitName,
  onSuccess,
  onClose,
}: DeleteHabitModalProps) {
  const [deleteMode, setDeleteMode] = useState<"ARCHIVE" | "HARD_DELETE">("ARCHIVE");
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHardDelete = deleteMode === "HARD_DELETE";
  const isConfirmed = !isHardDelete || confirmName.trim().toLowerCase() === habitName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);

    try {
      const url = isHardDelete
        ? `/api/tracked-habits/${habitId}?hard=true`
        : `/api/tracked-habits/${habitId}`;

      const res = await fetch(url, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || "Tidak dapat memproses permintaan ini.");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kendala saat menghapus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#131825] border border-white/10 p-6 sm:p-7 shadow-2xl flex flex-col gap-5 text-slate-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-rose-400 text-2xl">
              delete_forever
            </span>
            <h3 className="text-base font-bold text-white">
              Kelola Status Kebiasaan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-400">
            Pilih metode penghapusan untuk kebiasaan{" "}
            <strong className="text-white">&quot;{habitName}&quot;</strong>:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Opsi 1: Arsipkan */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                deleteMode === "ARCHIVE"
                  ? "bg-indigo-500/10 border-indigo-500/40 text-white"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="radio"
                name="deleteMode"
                value="ARCHIVE"
                checked={deleteMode === "ARCHIVE"}
                onChange={() => setDeleteMode("ARCHIVE")}
                className="mt-0.5 accent-indigo-500 cursor-pointer"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-white">
                  Arsipkan (Disarankan)
                </span>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  Menyembunyikan kebiasaan dari daftar aktif, namun catatan dan pencapaian tetap tersimpan untuk riwayat pribadi.
                </span>
              </div>
            </label>

            {/* Opsi 2: Hapus Permanen */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                deleteMode === "HARD_DELETE"
                  ? "bg-rose-500/10 border-rose-500/40 text-white"
                  : "bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05]"
              }`}
            >
              <input
                type="radio"
                name="deleteMode"
                value="HARD_DELETE"
                checked={deleteMode === "HARD_DELETE"}
                onChange={() => setDeleteMode("HARD_DELETE")}
                className="mt-0.5 accent-rose-500 cursor-pointer"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-rose-300">
                  Hapus Permanen
                </span>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  Menghapus kebiasaan beserta seluruh event, check-in, dan pengingat terkait dari basis data. Tindakan ini tidak dapat dibatalkan.
                </span>
              </div>
            </label>
          </div>
        </div>

        {isHardDelete && (
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[11px] font-semibold text-rose-300">
              Ketik nama kebiasaan untuk mengonfirmasi:
            </span>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={habitName}
              className="w-full bg-[#1a2133] px-3 py-2 rounded-xl border border-rose-500/30 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-400"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || !isConfirmed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isHardDelete
                ? "bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40"
                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
            }`}
          >
            {loading
              ? "Memproses..."
              : isHardDelete
              ? "Hapus Permanen Sekarang"
              : "Arsipkan Kebiasaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

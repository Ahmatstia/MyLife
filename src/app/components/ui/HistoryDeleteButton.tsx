"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { useConfirm } from "./Confirm";

export function HistoryDeleteButton({
  path,
  message,
  toastMessage,
  "aria-label": ariaLabel,
}: {
  path: string;
  message: string;
  toastMessage: string;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { askConfirm, confirmDialog } = useConfirm();

  async function remove() {
    if (loading) return;
    const confirmed = await askConfirm({
      title: "Hapus item",
      description: message,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast(toastMessage, "success");
      router.refresh();
    } catch {
      toast("Gagal menghapus.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={remove}
        aria-label={ariaLabel}
        className="rounded-lg p-1.5 text-gray-400 hover:text-[#F43F5E] hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Icon name="trash" size={14} />
      </button>
      {confirmDialog}
    </>
  );
}
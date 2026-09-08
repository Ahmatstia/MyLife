"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

interface BackButtonProps {
  fallbackUrl?: string;
  label?: string;
  className?: string;
  variant?: "pill" | "subtle" | "ghost";
}

export function BackButton({
  fallbackUrl = "/today",
  label = "Kembali",
  className = "",
  variant = "pill",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  const baseStyle =
    variant === "subtle"
      ? "inline-flex items-center gap-1.5 font-medium text-[#94a3b8] hover:text-white transition-colors text-xs font-mono cursor-pointer group"
      : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131825] hover:bg-[#1A2133] text-[#cbc3d7] hover:text-white border border-white/[0.08] hover:border-[#d0bcff]/30 transition-all text-xs font-mono cursor-pointer group shadow-sm";

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className || baseStyle}
      title="Kembali ke halaman sebelumnya"
    >
      <Icon
        name="arrowLeft"
        size={14}
        className="transition-transform group-hover:-translate-x-0.5 text-[#d0bcff]"
      />
      <span>{label}</span>
    </button>
  );
}

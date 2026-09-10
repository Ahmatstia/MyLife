"use client";

import { useState, useRef } from "react";
import { Icon } from "../ui/Icon";
import { VoiceInputButton } from "./VoiceInputButton";

type AIInputProps = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function AIInput({ onSubmit, disabled, placeholder, autoFocus = false }: AIInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ai-500">
          <Icon name="sparkles" size={17} />
        </span>
        <input
          ref={inputRef}
          data-ai-input
          autoFocus={autoFocus}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? "Tanya atau perintahkan sistem…"}
          aria-label="Masukan perintah AI"
          className="h-11 w-full rounded-xl border border-surface-200 bg-surface-0 pl-10 pr-11 text-sm text-surface-900 outline-none transition placeholder:text-surface-400 focus:border-ai-400 focus:ring-2 focus:ring-ai-100 disabled:opacity-50"
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <VoiceInputButton
            onTranscript={(text) => {
              setValue(text);
              onSubmit(text);
            }}
            disabled={disabled}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Kirim perintah"
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-ai-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-ai-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        ) : (
          <Icon name="arrowRight" size={16} />
        )}
        <span className="hidden sm:inline">{disabled ? "Memproses" : "Kirim"}</span>
      </button>
    </form>
  );
}

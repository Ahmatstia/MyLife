"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import { VoiceInputButton } from "@/app/components/ai/VoiceInputButton";

type MessageRole = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  source?: "tier1" | "gemini" | "unavailable";
  proposal?: {
    intent: string;
    description: string;
    requiresConfirmation: boolean;
    confirmationToken?: string;
    ambiguityCandidates?: Array<{ id: string; name: string; type: string; parentName?: string }>;
  };
  commandResult?: {
    success: boolean;
    code?: string;
    data?: unknown;
  };
  isLoading?: boolean;
  isError?: boolean;
};

const QUICK_ACTIONS = [
  { label: "Apa yang harus fokus hari ini?", icon: "target" as const, prompt: "Apa yang harus saya fokuskan hari ini?" },
  { label: "Lihat progress terkini", icon: "trendingUp" as const, prompt: "Bagaimana progress saya minggu ini?" },
  { label: "Buat goal baru", icon: "flag" as const, prompt: "Buat goal baru untuk saya" },
  { label: "Analitik & statistik", icon: "chart" as const, prompt: "Tampilkan analitik aktivitas saya" },
  { label: "Task yang overdue", icon: "alert" as const, prompt: "Tampilkan task yang sudah overdue" },
  { label: "Rencanakan hari ini", icon: "sun" as const, prompt: "Bantu saya merencanakan hari ini" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function SourceBadge({ source }: { source?: "tier1" | "gemini" | "unavailable" }) {
  if (!source || source === "unavailable") return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
      source === "gemini"
        ? "bg-[#a078ff]/15 text-[#a078ff]"
        : "bg-white/[0.05] text-[#64748b]"
    }`}>
      {source === "gemini" ? "✦ Gemini" : "AI"}
    </span>
  );
}

function MessageBubble({ message, onConfirm }: {
  message: ChatMessage;
  onConfirm: (token: string, text: string) => void;
}) {
  const isUser = message.role === "user";

  if (message.isLoading) {
    return (
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white">
          <Icon name="sparkles" size={13} />
        </span>
        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[#131825] border border-white/[0.06] px-4 py-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6] animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white">
          <Icon name="sparkles" size={13} />
        </span>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "rounded-tr-sm bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-white"
              : message.isError
                ? "rounded-tl-sm bg-red-500/10 border border-red-500/20 text-red-300"
                : "rounded-tl-sm bg-[#131825] border border-white/[0.06] text-[#e2e2eb]"
          }`}
        >
          {message.content}
        </div>

        {/* Source badge + timestamp */}
        <div className={`flex items-center gap-1.5 ${isUser ? "flex-row-reverse" : ""}`}>
          <SourceBadge source={message.source} />
          <span className="text-[10px] text-[#64748b]">
            {message.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Proposal card / Confirmation */}
        {message.proposal?.requiresConfirmation && message.proposal.confirmationToken && (
          <div className="w-full max-w-sm rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-500/15 text-yellow-400">
                <Icon name="alert" size={14} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-yellow-400 mb-1">Perlu konfirmasi</p>
                <p className="text-[12.5px] text-[#e2e2eb] leading-relaxed">{message.proposal.description}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onConfirm(message.proposal!.confirmationToken!, message.content)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#7C3AED] transition-colors"
                  >
                    <Icon name="check" size={12} />
                    Setujui & Jalankan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistantChat({ currentPage }: { currentPage?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Halo! Saya Life Copilot, asisten AI personal kamu. Tanyakan apa saja tentang goals, tasks, progress, atau minta saya membantu merencanakan hari kamu.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    const loadingId = generateId();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date(), isLoading: true },
    ]);
    setInput("");
    setIsLoading(true);

    const recentHistory = messages
      .filter((m) => !m.isLoading && !m.isError && (m.role === "user" || m.role === "assistant"))
      .slice(-6)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), currentPage, history: recentHistory }),
      });

      const data = await res.json() as {
        success: boolean;
        message: string;
        source?: "tier1" | "gemini" | "unavailable";
        commandProposal?: ChatMessage["proposal"];
        commandResult?: ChatMessage["commandResult"];
      };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                isLoading: false,
                content: data.message ?? "Maaf, ada kesalahan.",
                source: data.source,
                proposal: data.commandProposal,
                commandResult: data.commandResult,
                isError: !data.success,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, isLoading: false, content: "Koneksi gagal. Coba lagi.", isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [isLoading, currentPage, messages]);

  const handleConfirm = useCallback(async (token: string, originalText: string) => {
    const loadingId = generateId();
    setMessages((prev) => [
      ...prev,
      { id: loadingId, role: "assistant", content: "", timestamp: new Date(), isLoading: true },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: originalText, confirmed: true, confirmationToken: token }),
      });
      const data = await res.json() as { success: boolean; message: string; source?: "tier1" | "gemini" | "unavailable" };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, isLoading: false, content: data.message, source: data.source, isError: !data.success }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, isLoading: false, content: "Konfirmasi gagal. Coba lagi.", isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    void sendMessage(text);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto space-y-5 py-4 px-1 sm:px-2">
        {/* Quick actions — shown only when thread is empty/welcome */}
        {messages.length <= 1 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748b] px-1">Mulai dengan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.prompt}
                  onClick={() => void sendMessage(action.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-[#131825] px-3.5 py-2.5 text-left text-[12.5px] text-[#94a3b8] transition-all hover:border-[#8B5CF6]/30 hover:bg-[#1A2133] hover:text-white disabled:opacity-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Icon name={action.icon} size={14} />
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onConfirm={handleConfirm} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-white/[0.07] bg-[#0B0D13]/50 px-2 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-[#131825] px-3 py-2 focus-within:border-[#8B5CF6]/40 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya apa saja… (Enter untuk kirim, Shift+Enter baris baru)"
            disabled={isLoading}
            rows={1}
            style={{ resize: "none", height: "auto", minHeight: "36px", maxHeight: "120px" }}
            className="flex-1 bg-transparent text-[13.5px] text-[#e2e2eb] placeholder-[#4b5563] outline-none disabled:opacity-50"
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={isLoading} />
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || isLoading}
              aria-label="Kirim pesan"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon name="send" size={15} />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[#3f4f6a]">
          AI dapat membuat kesalahan. Periksa informasi penting sebelum mengonfirmasi tindakan.
        </p>
      </div>
    </div>
  );
}

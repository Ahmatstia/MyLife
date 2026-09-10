"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/app/components/ui/Icon";

const emptySubscribe = () => () => {};

export type VoiceInputProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
};

type VoiceState = "idle" | "listening" | "processing" | "unsupported" | "denied";

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

/**
 * Voice Input Button — uses Web Speech Recognition API.
 * Produces a transcript then passes it to the onTranscript callback.
 * Falls back gracefully when the browser doesn't support it.
 * Uses useSyncExternalStore to eliminate SSR/hydration HTML mismatches.
 */
export function VoiceInputButton({ onTranscript, disabled, className = "" }: VoiceInputProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false
  );

  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const final = res[0].transcript;
          setTranscript(final);
          setState("processing");
          onTranscript(final.trim());
        } else {
          interim += res[0].transcript;
          setTranscript(interim);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setState("denied");
      } else {
        setState("idle");
      }
      setTranscript("");
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setState((prev) => (prev === "listening" ? "idle" : prev));
    };

    setState("listening");
    setTranscript("");
    recognition.start();
  }, [isSupported, onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const toggle = () => {
    if (state === "listening") {
      stop();
    } else {
      start();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* State 1: Microphone permission explicitly denied */}
      {isMounted && state === "denied" ? (
        <button
          type="button"
          onClick={() => setState("idle")}
          title="Akses mikrofon ditolak. Klik untuk reset."
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400"
        >
          <Icon name="micOff" size={16} />
        </button>
      ) : !isMounted ? (
        /* State 2: SSR / Pre-hydration placeholder (matches server HTML exactly) */
        <button
          type="button"
          disabled
          aria-label="Input suara"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#94a3b8] opacity-50 cursor-not-allowed"
        >
          <Icon name="mic" size={16} />
        </button>
      ) : !isSupported ? (
        /* State 3: Client mounted but browser lacks SpeechRecognition API */
        <button
          type="button"
          disabled
          title="Browser Anda tidak mendukung input suara"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-surface-500 cursor-not-allowed opacity-50"
        >
          <Icon name="mic" size={16} />
        </button>
      ) : (
        /* State 4: Fully supported and interactive */
        <button
          type="button"
          onClick={toggle}
          disabled={disabled || state === "processing"}
          aria-label={state === "listening" ? "Hentikan rekaman" : "Mulai input suara"}
          title={state === "listening" ? "Klik untuk berhenti" : "Klik untuk bicara (id-ID)"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ${
            state === "listening"
              ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/20 text-[#d0bcff] shadow-[0_0_12px_rgba(139,92,246,0.35)]"
              : "border-white/10 bg-white/5 text-[#94a3b8] hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 hover:text-[#d0bcff]"
          }`}
        >
          {state === "listening" ? (
            <span className="flex h-3.5 w-3.5 items-center justify-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-0.5 rounded-full bg-[#d0bcff] animate-[voicePulse_0.8s_ease-in-out_infinite]"
                  style={{
                    height: "100%",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </span>
          ) : (
            <Icon name="mic" size={16} />
          )}
        </button>
      )}

      {/* Interim transcript preview */}
      {state === "listening" && transcript && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap max-w-[200px] truncate rounded-lg border border-white/10 bg-[#131825] px-3 py-1.5 text-xs text-[#94a3b8] shadow-lg pointer-events-none">
          {transcript}
        </div>
      )}
    </div>
  );
}

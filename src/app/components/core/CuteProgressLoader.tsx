"use client";

import { useState, useEffect } from "react";

const playfulPhrases = [
  "Sedang menyusun koordinat langkah...",
  "Mengumpulkan energi fokus hari ini...",
  "Menyiapkan kompas perjalanan...",
  "Merapikan peta stage & milestone...",
  "Sedikit lagi, momentum sedang terbangun...",
  "Menghubungkan jejak langkahmu...",
];

export function CuteProgressLoader() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % playfulPhrases.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] w-full px-4 py-8 animate-in-soft">
      {/* ── Cute Abstract Blob Creature ── */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Pulsing ambient aura */}
        <div
          aria-hidden="true"
          className="absolute h-36 w-36 rounded-full bg-gradient-to-tr from-primary-400/30 via-ai-400/30 to-warning-300/30 blur-2xl animate-pulse"
        />

        {/* Orbiting particles */}
        <div className="absolute h-28 w-28 animate-spin" style={{ animationDuration: "6s" }}>
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-warning-400 shadow-sm" />
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-ai-400 shadow-sm" />
          <span className="absolute top-1/2 -left-1 -translate-y-1/2 h-2 w-2 rounded-full bg-primary-400 shadow-sm" />
        </div>

        {/* Morphing Shape-Shifting Blob */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-[42%_58%_70%_30%/45%_45%_55%_55%] bg-gradient-to-br from-primary-500 via-ai-500 to-primary-600 shadow-lg transition-all"
          style={{
            animation: "morphBlob 4s ease-in-out infinite alternate, floatBob 2.4s ease-in-out infinite alternate",
          }}
        >
          {/* Eyes Container */}
          <div className="flex items-center gap-3.5">
            {/* Left Eye */}
            <div className="relative h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-xs">
              <div
                className="h-1.5 w-1.5 rounded-full bg-surface-900 animate-ping"
                style={{ animationDuration: "3s" }}
              />
              <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-white" />
            </div>

            {/* Right Eye */}
            <div className="relative h-3 w-3 rounded-full bg-white flex items-center justify-center shadow-xs">
              <div
                className="h-1.5 w-1.5 rounded-full bg-surface-900"
              />
              <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-white" />
            </div>
          </div>

          {/* Cute Smile */}
          <div className="absolute bottom-4.5 h-1 w-2.5 rounded-full border-b-2 border-white/80" />

          {/* Cheek blushes */}
          <span className="absolute bottom-4 left-3 h-1.5 w-2 rounded-full bg-rose-400/60 blur-[0.5px]" />
          <span className="absolute bottom-4 right-3 h-1.5 w-2 rounded-full bg-rose-400/60 blur-[0.5px]" />
        </div>
      </div>

      {/* ── Playful Rotating Phrase ── */}
      <div className="text-center max-w-sm">
        <p className="text-[13.5px] font-bold text-white/90 tracking-tight transition-all duration-300 min-h-[22px]">
          {playfulPhrases[phraseIndex]}
        </p>
        <p className="mt-1 text-[11.5px] text-[#94A3B8]">
          Menyiapkan data terbaik untuk perjalananmu...
        </p>
      </div>

      {/* Embedded keyframe styles for smooth blob motion */}
      <style jsx global>{`
        @keyframes morphBlob {
          0% {
            border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
            transform: rotate(0deg);
          }
          33% {
            border-radius: 70% 30% 46% 54% / 30% 29% 71% 70%;
            transform: rotate(6deg);
          }
          66% {
            border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%;
            transform: rotate(-4deg);
          }
          100% {
            border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
            transform: rotate(0deg);
          }
        }
        @keyframes floatBob {
          0% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.03);
          }
          100% {
            transform: translateY(0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

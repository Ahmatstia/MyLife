/**
 * Web Audio API synthesizer for prayer chime and adhan notifications.
 * Works 100% offline with zero external audio assets or CORS issues.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a soothing, harmonic mosque-style bell/chime sequence (Makam Bayati notes)
 */
export function playPrayerChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Harmonic chime chords/notes: D4, F4, G4, A4, D5 (Bayati feel)
    const notes = [
      { freq: 293.66, time: 0.0, duration: 1.2 }, // D4
      { freq: 349.23, time: 0.4, duration: 1.2 }, // F4
      { freq: 392.0, time: 0.8, duration: 1.4 },  // G4
      { freq: 440.0, time: 1.2, duration: 1.8 },  // A4
      { freq: 587.33, time: 1.8, duration: 2.5 }, // D5 (final resonant tone)
    ];

    notes.forEach(({ freq, time, duration }) => {
      const startTime = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft sine + gentle triangle harmonic mix
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack & decay envelope
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn("Unable to play prayer chime:", err);
  }
}

/**
 * Quick short test tone for volume/sound verification
 */
export function playTestChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, startTime); // A4
    osc.frequency.exponentialRampToValueAtTime(587.33, startTime + 0.25); // D5

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.8);
  } catch (err) {
    console.warn("Unable to play test chime:", err);
  }
}

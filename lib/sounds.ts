// Practice sound effects — the "chimes and pops" the Settings toggle controls.
//
// Synthesised with the Web Audio API so there are no audio files to ship or
// load. Every play is gated by the user's soundEffects preference, and the
// whole thing is a no-op on the server or where Web Audio is unavailable.

type SoundName = 'start' | 'stop' | 'success' | 'tick'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    // Browsers suspend the context until a user gesture; resume on demand.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** One short tone. */
function tone(freq: number, startAt: number, dur: number, type: OscillatorType, peak = 0.14) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + startAt)
  // Quick attack, smooth decay — a soft "pop"/"chime", never harsh.
  gain.gain.setValueAtTime(0.0001, c.currentTime + startAt)
  gain.gain.exponentialRampToValueAtTime(peak, c.currentTime + startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startAt + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(c.currentTime + startAt)
  osc.stop(c.currentTime + startAt + dur + 0.02)
}

const RECIPES: Record<SoundName, () => void> = {
  // Rising two-note chime — "we're recording".
  start: () => {
    tone(523.25, 0, 0.14, 'sine') // C5
    tone(783.99, 0.09, 0.16, 'sine') // G5
  },
  // Soft descending pop — "stopped".
  stop: () => {
    tone(587.33, 0, 0.12, 'sine') // D5
    tone(392.0, 0.08, 0.16, 'sine') // G4
  },
  // Bright three-note flourish — "passed / good result".
  success: () => {
    tone(523.25, 0, 0.12, 'triangle') // C5
    tone(659.25, 0.1, 0.12, 'triangle') // E5
    tone(1046.5, 0.2, 0.22, 'triangle') // C6
  },
  // Tiny neutral tick — countdowns / small confirmations.
  tick: () => tone(880, 0, 0.05, 'square', 0.06),
}

/**
 * Play a practice sound, but only if the user has sound effects enabled.
 * Pass the resolved preference (soundEffects) as the second arg.
 */
export function playSound(name: SoundName, enabled: boolean | undefined) {
  if (enabled === false) return // explicit opt-out
  try {
    RECIPES[name]?.()
  } catch {
    // Audio can fail for many benign reasons (autoplay policy, no device) —
    // never let a sound effect break practice.
  }
}

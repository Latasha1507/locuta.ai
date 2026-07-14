import { lc } from '@/components/landing/tokens'

// The six coaching tones.
//
// IMPORTANT: this lives in its own module — NOT inside a 'use client'
// component — because the server component (app/category/[categoryId]/modules)
// needs the real array to validate the ?tone= param. Values imported from a
// 'use client' module across the server boundary arrive as client-reference
// proxies, not real objects, so `TONES.some(...)` throws
// "TONES.some is not a function" at runtime (and the build cannot catch it).
// Keep shared values in neutral modules like this one.

export interface ToneDef {
  name: string
  icon: string
  color: string
  desc: string
}

export const TONES: ToneDef[] = [
  { name: 'Normal', icon: 'ic-chat', color: lc.green, desc: 'Clear, simple, everyday conversational style.' },
  { name: 'Supportive', icon: 'ic-heart', color: lc.coral, desc: 'Soft, kind and reassuring, like a good friend.' },
  { name: 'Inspiring', icon: 'ic-bolt', color: lc.yellow, desc: 'Energizing and passionate, like a motivator.' },
  { name: 'Funny', icon: 'ic-smile', color: lc.blue, desc: 'Entertaining, playful and casual with light humor.' },
  { name: 'Diplomatic', icon: 'ic-crown', color: lc.purple, desc: 'Calm, professional and balanced feedback.' },
  { name: 'Bossy', icon: 'ic-shield', color: '#f2545b', desc: 'Commanding, no-nonsense, direct leadership.' },
]

export const DEFAULT_TONE = 'Normal'

/** What the mascot says when you pick a coach — previews the voice. */
export const TONE_QUIPS: Record<string, string> = {
  Normal: "Let's keep it clear and easy.",
  Supportive: "You've got this. I'm right here.",
  Inspiring: 'Today you find your voice!',
  Funny: 'Warning: I may heckle. Kindly.',
  Diplomatic: 'Measured, fair, straight to the point.',
  Bossy: 'No excuses. Chin up. Speak.',
}

/**
 * Only ever pass a known tone downstream — the value reaches the GPT prompt,
 * so arbitrary text from the URL must not get through.
 */
export function resolveTone(input: string | undefined | null): string {
  if (!input) return DEFAULT_TONE
  return TONES.some((t) => t.name === input) ? input : DEFAULT_TONE
}

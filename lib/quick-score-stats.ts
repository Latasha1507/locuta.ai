import { createAdminClient } from '@/lib/supabase/server-admin'

// SERVER ONLY. Stores every completed 30-second test result and derives a real
// percentile from them.
//
// Why store anything: "you spoke better than 77% of people" is the single
// strongest reason to share a result — but only if it's TRUE. Inventing a
// percentile from a made-up curve would be exactly the kind of misleading
// number this rewrite exists to remove. So we keep an anonymous row per result
// and compute the percentile from real data, and we show nothing at all until
// there is enough of it.
//
// PRIVACY: the row holds a score, a prompt id and a timestamp. No user id, no
// transcript, no audio, no IP. It is not linkable to a person.

/** Below this many recorded results the percentile is statistically junk, so we
    omit it entirely rather than show a confident-looking lie. */
export const MIN_SAMPLE = 30

const TABLE = 'quick_score_results'

/** Fire-and-forget. Never throws and never blocks the response — a stats
    failure must not cost the user their score. */
export async function recordResult(overall: number, promptId: number): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from(TABLE).insert({ overall, prompt_id: promptId })
  } catch (err) {
    console.error('quick-score stats insert failed (non-fatal):', err)
  }
}

/**
 * Percentage of previous takers this score beats, 1–99.
 * Returns undefined when we don't have enough data to say something true.
 */
export async function percentileFor(overall: number): Promise<number | undefined> {
  try {
    const supabase = createAdminClient()

    const [{ count: total }, { count: below }] = await Promise.all([
      supabase.from(TABLE).select('*', { count: 'exact', head: true }),
      supabase.from(TABLE).select('*', { count: 'exact', head: true }).lt('overall', overall),
    ])

    if (!total || total < MIN_SAMPLE) return undefined

    const pct = Math.round(((below ?? 0) / total) * 100)
    // Clamp off the extremes: "better than 0%" and "better than 100%" are both
    // demoralising or implausible, and neither is worth sharing.
    return Math.max(1, Math.min(99, pct))
  } catch (err) {
    console.error('quick-score percentile failed (non-fatal):', err)
    return undefined
  }
}

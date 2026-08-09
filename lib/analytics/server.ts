/**
 * Server-side Mixpanel — for events that must be tracked from trusted backend
 * code, not the browser (payments being the canonical case: the client can't be
 * trusted to report money moving, and the user may close the tab before any
 * client event fires).
 *
 * Uses Mixpanel's HTTP ingestion API directly (no SDK dependency). The project
 * token is the same public token used client-side, so nothing secret lives here.
 *
 * CONTRACT: every function is best-effort and MUST NOT throw. Analytics can
 * never be allowed to break a payment webhook. Callers should still wrap in
 * Promise.allSettled for defence-in-depth, but these already swallow all errors.
 */

const MIXPANEL_TOKEN =
  process.env.MIXPANEL_TOKEN || process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
// US project by default (this line is US-first). Override for EU residency.
const API_BASE = process.env.MIXPANEL_API_BASE || 'https://api.mixpanel.com'
const TIMEOUT_MS = 3000

async function postToMixpanel(path: '/track' | '/engage', payload: unknown): Promise<void> {
  if (!MIXPANEL_TOKEN) {
    console.warn(`[analytics/server] MIXPANEL token not set — skipping ${path}`)
    return
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE}${path}?verbose=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`[analytics/server] ${path} HTTP ${res.status}`)
      return
    }
    // verbose=1 → { status: 1 } on success, { status: 0, error: '…' } on reject.
    const json = (await res.json().catch(() => null)) as { status?: number; error?: string } | null
    if (json && json.status !== 1) {
      console.error(`[analytics/server] ${path} rejected:`, json.error ?? 'unknown')
    }
  } catch (e) {
    console.error(`[analytics/server] ${path} failed:`, e instanceof Error ? e.message : e)
  } finally {
    clearTimeout(timer)
  }
}

/** Track an event for a known user. `insertId` dedupes retried deliveries. */
export async function trackServer(params: {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
  insertId?: string
}): Promise<void> {
  const { event, distinctId, properties = {}, insertId } = params
  await postToMixpanel('/track', [
    {
      event,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: distinctId,
        time: Date.now(),
        ...(insertId ? { $insert_id: insertId } : {}),
        $source: 'server',
        ...properties,
      },
    },
  ])
}

/** Set profile properties on a user (Mixpanel People $set). */
export async function setPeopleServer(
  distinctId: string,
  props: Record<string, unknown>,
): Promise<void> {
  await postToMixpanel('/engage', [
    { $token: MIXPANEL_TOKEN, $distinct_id: distinctId, $set: props },
  ])
}

/**
 * Record revenue against a user (Mixpanel People $transactions). Powers
 * Mixpanel's built-in revenue / LTV reporting. `amount` is in major units
 * (e.g. dollars), not cents.
 */
export async function trackChargeServer(
  distinctId: string,
  amount: number,
  props?: Record<string, unknown>,
): Promise<void> {
  await postToMixpanel('/engage', [
    {
      $token: MIXPANEL_TOKEN,
      $distinct_id: distinctId,
      $append: {
        $transactions: { $time: new Date().toISOString(), $amount: amount, ...(props ?? {}) },
      },
    },
  ])
}

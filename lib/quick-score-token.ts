import crypto from 'crypto'
import { normaliseScore, type QuickScore } from './quick-score'

// Server-only by construction: importing node's `crypto` makes this fail to
// compile if it's ever pulled into a client bundle. Only server files (the API
// route, the share page, the OG image) import it.
//
// Signs a QuickScore into a compact, tamper-proof token that rides
// in the share URL (…/s/<token>). Because scores are shared competitively, the
// number MUST be unforgeable — an HMAC over the payload means nobody can hand-
// edit a 68 into a 99. There is no database: the token IS the record.
//
// PRIVACY: the payload holds the numbers plus SHORT, constructive coaching
// lines (≤2 each) — never the transcript or audio. The token is signed, not
// encrypted, so a determined person with the raw link could base64-decode those
// lines; they're deliberately generic and non-sensitive, and the public share
// image + stranger view never render them. If we ever want feedback fully off
// the URL, that's the point we'd introduce a DB row keyed by a short id.

function secret(): string {
  // Dedicated secret preferred; fall back to the service-role key (always set
  // in any real deployment) so this never becomes a new required env var. The
  // signing key never leaves the server.
  const s = process.env.QUICK_SCORE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) {
    throw new Error(
      'QUICK_SCORE_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is required to sign share cards',
    )
  }
  return s
}

function hmac(body: string): string {
  return crypto.createHmac('sha256', secret()).update(body).digest('base64url')
}

const capLine = (x: unknown) => String(x ?? '').slice(0, 60)

export function signScore(s: QuickScore): string {
  // Short keys keep the URL small. t = issued-at (unix seconds), kept for
  // future analytics/expiry; not currently enforced so links live forever.
  // s/i are the short coaching lines (≤2 each) — see the privacy note above.
  const payload = {
    v: 3,
    p: s.promptId,
    o: s.overall,
    // the four measured/judged dimensions
    pc: s.pace,
    fl: s.fluency,
    fw: s.flow,
    ct: s.content,
    // raw measurements behind them
    w: s.wpm,
    f: s.filler,
    r: s.restarts,
    lp: s.longPauses,
    // percentile is optional — absent until we have a real sample
    ...(typeof s.percentile === 'number' ? { pt: s.percentile } : {}),
    s: (s.strengths ?? []).slice(0, 2).map(capLine),
    i: (s.improvements ?? []).slice(0, 2).map(capLine),
    t: Math.floor(Date.now() / 1000),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${hmac(body)}`
}

export function verifyScore(token: string): QuickScore | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  let expected: string
  try {
    expected = hmac(body)
  } catch {
    return null
  }

  const given = Buffer.from(sig)
  const want = Buffer.from(expected)
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null

  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    // v1/v2 are the old clarity+confidence tokens; v3 is the measured model.
    // Old links stay readable — normaliseScore maps them onto the new shape.
    if (p.v !== 1 && p.v !== 2 && p.v !== 3) return null
    const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
    if (![p.p, p.o].every(isNum)) return null
    const cl = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(x)))
    const lines = (x: unknown): string[] =>
      Array.isArray(x)
        ? x
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 2)
        : []

    return normaliseScore({
      v: p.v,
      promptId: cl(p.p, 0, 9999),
      overall: cl(p.o, 0, 100),
      pace: isNum(p.pc) ? cl(p.pc, 0, 100) : undefined,
      fluency: isNum(p.fl) ? cl(p.fl, 0, 100) : undefined,
      flow: isNum(p.fw) ? cl(p.fw, 0, 100) : undefined,
      content: isNum(p.ct) ? cl(p.ct, 0, 100) : undefined,
      wpm: isNum(p.w) ? cl(p.w, 0, 9999) : undefined,
      filler: isNum(p.f) ? cl(p.f, 0, 9999) : undefined,
      restarts: isNum(p.r) ? cl(p.r, 0, 9999) : undefined,
      longPauses: isNum(p.lp) ? cl(p.lp, 0, 9999) : undefined,
      percentile: isNum(p.pt) ? cl(p.pt, 1, 99) : undefined,
      // legacy fields, only present on v1/v2 tokens
      clarity: isNum(p.c) ? cl(p.c, 0, 100) : undefined,
      confidence: isNum(p.n) ? cl(p.n, 0, 100) : undefined,
      strengths: lines(p.s),
      improvements: lines(p.i),
    })
  } catch {
    return null
  }
}

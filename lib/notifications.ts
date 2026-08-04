// Email notifications — the Settings toggles (daily reminder, streak-at-risk,
// weekly recap) made real. Sent via Resend and driven by the cron route at
// /api/cron/notifications. No push here — this is email only; browser/mobile
// push is a separate, larger job.

const FROM = 'Locuta <onboarding@resend.dev>' // matches the rest of the app; swap to a verified locuta.in sender once the domain is set up in Resend
const APP_URL = 'https://locuta.in'

export type NotificationKind = 'daily' | 'streak' | 'weekly'

/** Send one email through Resend. Returns true on success. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — cannot send notification')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
    if (!res.ok) {
      console.error('Resend send failed:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (e) {
    console.error('Resend send error:', e)
    return false
  }
}

// ── Templates ───────────────────────────────────────────────────────────────
// Deliberately plain and warm. First name only; a settings link for control.

function shell(body: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#4b4b4b">
    <div style="font-weight:800;font-size:20px;color:#2fa552;margin-bottom:16px">locuta</div>
    ${body}
    <hr style="border:none;border-top:1px solid #e8ece2;margin:24px 0" />
    <p style="font-size:12px;color:#98a690">You're getting this because of your Locuta notification settings.
      <a href="${APP_URL}/settings" style="color:#3fb950">Change them here</a>.</p>
  </div>`
}

function cta(label: string): string {
  return `<a href="${APP_URL}/dashboard" style="display:inline-block;background:#3fce6f;color:#fff;font-weight:800;text-decoration:none;padding:12px 22px;border-radius:12px;margin:8px 0">${label}</a>`
}

export function dailyReminderEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: 'Your 60-second rep is waiting',
    html: shell(`<p style="font-size:16px">Hi ${firstName},</p>
      <p>One 60-second rep keeps your streak alive and your speaking sharp. It's quick — you'll be done before your tea gets cold.</p>
      <p>${cta("Do today's rep")}</p>`),
  }
}

export function streakAtRiskEmail(firstName: string, streak: number): { subject: string; html: string } {
  return {
    subject: `Don't lose your ${streak}-day streak 🔥`,
    html: shell(`<p style="font-size:16px">Hi ${firstName},</p>
      <p>Your <strong>${streak}-day streak</strong> is about to break. One quick rep before the day ends keeps it going.</p>
      <p>${cta('Keep my streak')}</p>`),
  }
}

export function weeklyRecapEmail(
  firstName: string,
  stats: { sessions: number; avgScore: number; bestScore: number },
): { subject: string; html: string } {
  return {
    subject: 'Your week on Locuta',
    html: shell(`<p style="font-size:16px">Hi ${firstName},</p>
      <p>Here's how last week went:</p>
      <ul style="line-height:1.8">
        <li><strong>${stats.sessions}</strong> practice ${stats.sessions === 1 ? 'session' : 'sessions'}</li>
        <li>Average score <strong>${stats.avgScore}</strong></li>
        <li>Best score <strong>${stats.bestScore}</strong></li>
      </ul>
      <p>${cta('Start this week strong')}</p>`),
  }
}

// ── Timing helpers ───────────────────────────────────────────────────────────

/** The user's current local hour (0–23) in their IANA timezone. */
export function localHour(timezone: string | undefined): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(fmt.format(new Date()), 10) % 24
  } catch {
    return new Date().getUTCHours()
  }
}

/** Their local weekday, 0=Sun … 6=Sat. */
export function localWeekday(timezone: string | undefined): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', weekday: 'short' })
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(fmt.format(new Date()))
  } catch {
    return new Date().getUTCDay()
  }
}

/** Their local calendar date (YYYY-MM-DD) — used to dedupe once-a-day sends. */
export function localDateKey(timezone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** Parse a "7:00 PM" / "7 PM" reminder string into a 0–23 hour. */
export function reminderHour(reminderTime: string | undefined): number {
  if (!reminderTime) return 19
  const m = reminderTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!m) return 19
  let h = parseInt(m[1], 10) % 12
  if (/pm/i.test(m[3] || '')) h += 12
  return h
}

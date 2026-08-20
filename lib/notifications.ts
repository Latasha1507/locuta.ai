// Email notifications — the Settings toggles (daily reminder, streak-at-risk,
// weekly recap) made real. Sent via Resend and driven by the cron route at
// /api/cron/notifications. No push here — this is email only; browser/mobile
// push is a separate, larger job.
//
// Hard rule (see the cron route): AT MOST ONE email per user per local day.
// Nobody wants hourly — or even daily — mail, so we send sparingly and on brand.

const FROM = 'Locuta <onboarding@resend.dev>' // swap to a verified locuta.in sender once the domain is set up in Resend
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

// ── Brand ─────────────────────────────────────────────────────────────────────
// Pulled straight from the design system (components/landing/tokens.ts). The
// logo + mascot are hosted in /public, so they resolve at locuta.in once deployed.

const brand = {
  green: '#3fce6f',
  greenDark: '#2fa552',
  ink: '#4b4b4b',
  faint: '#98a690',
  pageBg: '#fbfdfa',
  card: '#ffffff',
  border: '#e8ece2',
  logo: `${APP_URL}/logo.png`,
  mascot: `${APP_URL}/mascot.png`,
}
// Baloo 2 (display) + Nunito (body). Clients that honour @import (Apple Mail)
// get the real fonts; everyone else falls back to the rounded system stack.
const fontDisplay = "'Baloo 2','Trebuchet MS','Segoe UI',system-ui,sans-serif"
const fontBody = "'Nunito',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** Escape user-supplied text (first name) before it lands in the HTML. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

// ── Template shell ────────────────────────────────────────────────────────────
// One chunky, rounded card. Bottom borders fake the signature "3D" shadow
// (real box-shadow is stripped by Gmail). Everything is inline-styled because
// Gmail also strips <style>; the @import is a progressive enhancement only.

function shell(opts: { preheader: string; headline: string; body: string; ctaLabel: string; ctaHref?: string }): string {
  const href = opts.ctaHref ?? `${APP_URL}/dashboard`
  return `<div style="background:${brand.pageBg};margin:0;padding:24px 12px;font-family:${fontBody};-webkit-text-size-adjust:100%">
  <style>@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;600;700&display=swap');</style>
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
  <div style="max-width:460px;margin:0 auto;background:${brand.card};border:1px solid ${brand.border};border-bottom:4px solid ${brand.border};border-radius:20px;overflow:hidden">
    <div style="padding:26px 28px 0;text-align:center">
      <img src="${brand.logo}" width="112" alt="Locuta" style="display:inline-block;height:auto;border:0;outline:none;text-decoration:none" />
    </div>
    <div style="padding:10px 28px 0;text-align:center">
      <img src="${brand.mascot}" width="88" alt="" style="display:inline-block;height:auto;border:0;outline:none" />
    </div>
    <div style="padding:6px 32px 0;text-align:center">
      <h1 style="font-family:${fontDisplay};font-size:24px;line-height:1.15;font-weight:800;color:${brand.ink};margin:12px 0 8px">${opts.headline}</h1>
      <div style="font-size:16px;line-height:1.55;color:${brand.ink};opacity:.88;margin:0">${opts.body}</div>
    </div>
    <div style="text-align:center;padding:22px 28px 30px">
      <a href="${href}" style="display:inline-block;background:${brand.green};color:#ffffff;font-family:${fontDisplay};font-weight:800;font-size:16px;text-decoration:none;padding:13px 32px;border-radius:14px;border-bottom:4px solid ${brand.greenDark}">${opts.ctaLabel}</a>
    </div>
  </div>
  <div style="max-width:460px;margin:14px auto 0;text-align:center;font-size:12px;line-height:1.5;color:${brand.faint}">
    You're getting this because of your Locuta reminder settings.<br />
    <a href="${APP_URL}/settings" style="color:${brand.greenDark};text-decoration:underline">Manage notifications</a>
  </div>
</div>`
}

// ── Templates ─────────────────────────────────────────────────────────────────
// Short, warm, a little bit of marketing swagger. First name only.

export function dailyReminderEmail(firstName: string): { subject: string; html: string } {
  const name = esc(firstName)
  return {
    subject: 'Ready for your comeback? 🎤',
    html: shell({
      preheader: 'One 60-second rep and your momentum is back.',
      headline: 'Your mic misses you',
      body: `Hey ${name} — a couple of days off, no big deal. One 60-second rep and you're back in rhythm. Fluency compounds, so today's a great day to add to the pile.`,
      ctaLabel: 'Jump back in',
    }),
  }
}

export function streakAtRiskEmail(firstName: string, streak: number): { subject: string; html: string } {
  const name = esc(firstName)
  return {
    subject: `🔥 Don't drop your ${streak}-day streak`,
    html: shell({
      preheader: `Your ${streak}-day streak resets at midnight — one rep saves it.`,
      headline: `${streak} days strong 🔥`,
      body: `You've shown up ${name ? name + ', ' : ''}${streak} days in a row — that's real momentum. One quick rep before midnight locks in day ${streak + 1}.`,
      ctaLabel: 'Save my streak',
    }),
  }
}

export function weeklyRecapEmail(
  firstName: string,
  stats: { sessions: number; avgScore: number; bestScore: number },
): { subject: string; html: string } {
  const name = esc(firstName)
  const cell = (value: string | number, label: string) =>
    `<td width="33.33%" style="text-align:center;padding:6px">
      <div style="font-family:${fontDisplay};font-size:30px;font-weight:800;color:${brand.green};line-height:1">${value}</div>
      <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${brand.faint};margin-top:4px">${label}</div>
    </td>`
  const statsRow = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 4px;border-collapse:collapse">
      <tr>
        ${cell(stats.sessions, stats.sessions === 1 ? 'Session' : 'Sessions')}
        ${cell(stats.avgScore, 'Avg score')}
        ${cell(stats.bestScore, 'Best')}
      </tr>
    </table>`
  return {
    subject: 'Your week on Locuta 📈',
    html: shell({
      preheader: 'Your week in reps, scores, and wins.',
      headline: "That's a wrap on your week",
      body: `Nice work${name ? ', ' + name : ''} — here's the tape:${statsRow}Momentum loves company. Let's run it back.`,
      ctaLabel: 'Start a strong week',
    }),
  }
}

// ── Timing helpers ────────────────────────────────────────────────────────────

/** Their local weekday, 0=Sun … 6=Sat — used to fire the Sunday recap. */
export function localWeekday(timezone: string | undefined): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', weekday: 'short' })
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(fmt.format(new Date()))
  } catch {
    return new Date().getUTCDay()
  }
}

/** A date's local calendar day (YYYY-MM-DD) in the given tz. Defaults to now. */
export function localDateKey(timezone: string | undefined, when: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC' }).format(when)
  } catch {
    return when.toISOString().slice(0, 10)
  }
}

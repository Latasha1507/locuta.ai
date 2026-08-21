// Email — every outbound message (coach invites, daily/streak/weekly
// notifications, founder-call confirmations) goes through the one sendEmail()
// below, sent via Resend's API from info@locuta.in. Resend authenticates by API
// key alone (no IP allow-list), which is why it works from Vercel's serverless
// functions where Brevo's IP-authorization security kept 401-blocking the
// rotating outbound IPs. Marketing/newsletters live separately in Brevo.
//
// Hard rule (see the cron route): AT MOST ONE notification email per user per
// local day. Nobody wants hourly — or even daily — mail, so we send sparingly.

const FROM = 'Locuta <info@locuta.in>' // requires locuta.in verified in Resend (resend.com/domains)
const APP_URL = 'https://locuta.in'

export type NotificationKind = 'daily' | 'streak' | 'weekly'

/** Send one email through Resend. Returns true on success. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — cannot send email')
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

/**
 * Coach complimentary invite. NOT a reminder — its own shell (no "manage
 * notifications" footer), a passwordless sign-in CTA (the Supabase action link),
 * and a plain statement of what the account is. `actionLink` is a trusted URL
 * from Supabase auth; it is NOT escaped (escaping would corrupt its query
 * string) and must never be logged.
 */
export function coachInviteEmail(opts: {
  name?: string
  actionLink: string
  cap: number
  days: number
}): { subject: string; html: string } {
  const first = opts.name ? esc(opts.name.trim().split(/\s+/)[0]) : ''
  const greeting = first ? `Hi ${first}, ` : 'Hi there, '
  const cap = Math.max(1, Math.floor(opts.cap))
  const days = Math.max(1, Math.floor(opts.days))
  const line = (text: string) =>
    `<tr><td style="font-size:15px;color:${brand.ink};opacity:.9;padding:0">${text}</td></tr>`
  const html = `<div style="background:${brand.pageBg};margin:0;padding:24px 12px;font-family:${fontBody};-webkit-text-size-adjust:100%">
  <style>@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;600;700&display=swap');</style>
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">Full access for ${days} days, up to ${cap} practice sessions, on us.</span>
  <div style="max-width:460px;margin:0 auto;background:${brand.card};border:1px solid ${brand.border};border-bottom:4px solid ${brand.border};border-radius:20px;overflow:hidden">
    <div style="padding:26px 28px 0;text-align:center">
      <img src="${brand.logo}" width="112" alt="Locuta" style="display:inline-block;height:auto;border:0;outline:none;text-decoration:none" />
    </div>
    <div style="padding:10px 28px 0;text-align:center">
      <img src="${brand.mascot}" width="88" alt="" style="display:inline-block;height:auto;border:0;outline:none" />
    </div>
    <div style="padding:6px 32px 0;text-align:center">
      <h1 style="font-family:${fontDisplay};font-size:24px;line-height:1.15;font-weight:800;color:${brand.ink};margin:12px 0 8px">Your Locuta access is ready</h1>
      <div style="font-size:16px;line-height:1.55;color:${brand.ink};opacity:.88;margin:0">${greeting}we've set you up with full access, so you can try Locuta exactly the way the people you coach would. Open any speaking path, run a few real practice sessions, and see the feedback they'd get.</div>
    </div>
    <div style="padding:16px 34px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 9px">
        ${line('✓&nbsp;&nbsp;All six speaking paths, every lesson unlocked')}
        ${line(`✓&nbsp;&nbsp;${cap} practice sessions with instant feedback`)}
        ${line(`✓&nbsp;&nbsp;Free for ${days} days, from the moment you sign in`)}
      </table>
    </div>
    <div style="padding:14px 34px 0;font-size:14px;line-height:1.55;color:${brand.ink};opacity:.78">
      Have a proper look around. If you think it could help the people you work with, just reply to this email and we'll sort out the easiest way to bring them on.
    </div>
    <div style="text-align:center;padding:20px 28px 30px">
      <a href="${opts.actionLink}" style="display:inline-block;background:${brand.green};color:#ffffff;font-family:${fontDisplay};font-weight:800;font-size:16px;text-decoration:none;padding:13px 32px;border-radius:14px;border-bottom:4px solid ${brand.greenDark}">Start exploring</a>
    </div>
  </div>
  <div style="max-width:460px;margin:14px auto 0;text-align:center;font-size:12px;line-height:1.5;color:${brand.faint}">
    We set this account up for you personally.<br />
    The button signs you in, no password needed. Any questions, just reply.
  </div>
</div>`
  return { subject: 'Your Locuta access is ready 🎤', html }
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

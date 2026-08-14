import type { NextRequest } from 'next/server'

/**
 * Analytics dimensions derived from the incoming request, WITHOUT storing PII.
 *
 * - browser/device come from the User-Agent string.
 * - country/city come from Vercel's edge geo headers (populated in production on
 *   Vercel; empty in local dev, which is fine — we fall back to 'Unknown').
 * - We deliberately do NOT capture or store the IP address.
 *
 * Everything falls back to 'Unknown' so the admin analytics charts always have a
 * bucket to count rather than a null. The browser labels intentionally match the
 * colour map in app/api/admin/analytics/route.ts
 * (Chrome / Safari / Firefox / Edge / Opera / Other / Unknown).
 */
export interface RequestMeta {
  browserType: string
  deviceType: string
  userCountry: string
  userCity: string
}

export function getRequestMeta(request: Request | NextRequest): RequestMeta {
  const ua = request.headers.get('user-agent') ?? ''
  return {
    browserType: detectBrowser(ua),
    deviceType: detectDevice(ua),
    // x-vercel-ip-country is a 2-letter ISO code (e.g. "US", "IN").
    userCountry: request.headers.get('x-vercel-ip-country')?.trim() || 'Unknown',
    // x-vercel-ip-city is URL-encoded (e.g. "San%20Francisco").
    userCity: decodeHeader(request.headers.get('x-vercel-ip-city')) || 'Unknown',
  }
}

function decodeHeader(v: string | null): string {
  if (!v) return ''
  try {
    return decodeURIComponent(v).trim()
  } catch {
    return v.trim()
  }
}

// Order matters: Edge/Opera UAs also contain "Chrome", and Chrome UAs contain
// "Safari" — so the more specific brands must be tested first.
function detectBrowser(ua: string): string {
  if (!ua) return 'Unknown'
  if (/\bEdg(e|A|iOS)?\//i.test(ua)) return 'Edge'
  if (/\bOPR\/|\bOpera\b/i.test(ua)) return 'Opera'
  if (/\bFirefox\/|\bFxiOS\//i.test(ua)) return 'Firefox'
  if (/\bChrome\/|\bCriOS\//i.test(ua)) return 'Chrome'
  if (/\bSafari\//i.test(ua)) return 'Safari'
  return 'Other'
}

function detectDevice(ua: string): string {
  if (!ua) return 'Unknown'
  if (/\biPad\b/i.test(ua) || (/\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua)) || /\bTablet\b/i.test(ua)) {
    return 'Tablet'
  }
  if (/\bMobi|\biPhone\b|\biPod\b|Windows Phone\b/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

'use client'

import { useEffect } from 'react'

/**
 * Saves the user's IANA timezone to their preferences once, so time-based
 * emails (the "7 PM daily reminder") fire at their real local time. The cron
 * has no other way to know the user's timezone. Fire-and-forget; guarded by a
 * localStorage flag so it runs at most once per browser per tz.
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz) return
      const key = 'lc_tz_synced'
      if (localStorage.getItem(key) === tz) return
      void fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { timezone: tz } }),
      })
        .then((r) => {
          if (r.ok) localStorage.setItem(key, tz)
        })
        .catch(() => {})
    } catch {
      // no-op
    }
  }, [])
  return null
}

'use client'

import { useEffect } from 'react'
import Mixpanel from '@/lib/mixpanel'
import { EVENTS } from '@/lib/analytics/events'

/**
 * Fires the dedicated Pricing Page Viewed event with intent context (which plan
 * was pre-selected, and where the user came from). The auto Page Viewed already
 * records the /pricing hit; this adds the source/plan context that makes the
 * pricing funnel readable. Server component → this tiny client child does it.
 */
export function PricingPageTracker({
  autoPlan,
  source,
}: {
  autoPlan: string | null
  source: string | null
}) {
  useEffect(() => {
    try {
      Mixpanel.track(EVENTS.PRICING_PAGE_VIEWED, {
        auto_plan: autoPlan,
        source: source ?? 'direct',
      })
    } catch {
      // analytics must never break the page
    }
  }, [autoPlan, source])
  return null
}

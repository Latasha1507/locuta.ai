'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Mixpanel from '@/lib/mixpanel';
import { createClient } from '@/lib/supabase/client';

/**
 * Single source of truth for Mixpanel's client-side lifecycle.
 *
 * Mounted once in the root layout, it owns three things so the rest of the app
 * doesn't have to:
 *   1. Super properties (device / browser / OS / screen / locale) sent with every event.
 *   2. Identity lifecycle — identify + people.set on sign-in, reset on sign-out.
 *      Reset on sign-out matters on shared devices: without it the next person to
 *      use the browser inherits the previous user's Mixpanel identity from localStorage.
 *   3. Automatic page-view tracking on every route change.
 */
export default function MixpanelProvider() {
  const pathname = usePathname();
  const lastIdentified = useRef<string | null>(null);

  // 1. Super properties — registered once, then attached to every event.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

    let deviceType = 'desktop';
    if (isMobile) deviceType = 'mobile';
    if (isTablet) deviceType = 'tablet';

    const browser = ua.includes('Edg') ? 'Edge'
      : ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Safari') ? 'Safari'
      : 'Other';

    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Android') ? 'Android'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Linux') ? 'Linux'
      : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : 'Other';

    Mixpanel.registerSuperProperties({
      'Device Type': deviceType,
      Browser: browser,
      'Operating System': os,
      'Screen Width': window.innerWidth,
      'Screen Height': window.innerHeight,
      'Viewport Ratio': `${window.innerWidth}x${window.innerHeight}`,
      Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      Language: navigator.language,
    });
  }, []);

  // 2. Identity lifecycle, driven off Supabase auth state.
  useEffect(() => {
    const supabase = createClient();

    const applyIdentity = (session: { user?: { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> } } | null) => {
      const user = session?.user;
      if (!user) return;
      // Guard against redundant identify/people.set on token refreshes.
      if (lastIdentified.current === user.id) return;
      lastIdentified.current = user.id;

      Mixpanel.identify(user.id);

      const meta = user.user_metadata ?? {};
      const name = (meta.full_name || meta.name || meta.display_name) as string | undefined;
      Mixpanel.people.set({
        ...(user.email ? { $email: user.email } : {}),
        ...(name ? { $name: name } : {}),
        ...(user.created_at ? { $created: user.created_at } : {}),
        user_id: user.id,
      });
    };

    // Cover the already-signed-in case on first load.
    supabase.auth.getSession().then(({ data }) => applyIdentity(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        Mixpanel.reset();
        lastIdentified.current = null;
        return;
      }
      applyIdentity(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // 3. Page views on every route change.
  useEffect(() => {
    if (pathname) Mixpanel.trackPageView(pathname);
  }, [pathname]);

  return null;
}

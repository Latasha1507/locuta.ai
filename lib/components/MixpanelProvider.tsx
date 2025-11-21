'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Mixpanel from '@/lib/mixpanel';

export default function MixpanelProvider() {
  const pathname = usePathname();

  // Track page views automatically whenever route changes
  useEffect(() => {
    if (pathname) {
      Mixpanel.trackPageView(pathname);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
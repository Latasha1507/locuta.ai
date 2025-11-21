'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Mixpanel from '@/lib/mixpanel';

export default function MixpanelProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      Mixpanel.trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
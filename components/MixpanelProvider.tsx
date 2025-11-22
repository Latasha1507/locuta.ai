'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Mixpanel from '@/lib/mixpanel';

export default function MixpanelProvider() {
  const pathname = usePathname();

  // Register super properties once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
      
      let deviceType = 'desktop';
      if (isMobile) deviceType = 'mobile';
      if (isTablet) deviceType = 'tablet';
      
      const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                      navigator.userAgent.includes('Safari') ? 'Safari' : 
                      navigator.userAgent.includes('Firefox') ? 'Firefox' :
                      navigator.userAgent.includes('Edge') ? 'Edge' : 'Other';
      
      const os = navigator.userAgent.includes('Windows') ? 'Windows' :
                 navigator.userAgent.includes('Mac') ? 'macOS' :
                 navigator.userAgent.includes('Linux') ? 'Linux' :
                 navigator.userAgent.includes('Android') ? 'Android' :
                 navigator.userAgent.includes('iOS') ? 'iOS' : 'Other';
      
      Mixpanel.registerSuperProperties({
        'Device Type': deviceType,
        'Browser': browser,
        'Operating System': os,
        'Screen Width': window.innerWidth,
        'Screen Height': window.innerHeight,
        'Viewport Ratio': `${window.innerWidth}x${window.innerHeight}`,
        'Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Language': navigator.language
      });
      
      console.log('✅ Mixpanel Super Properties registered:', {
        deviceType,
        browser,
        os,
        screen: `${window.innerWidth}x${window.innerHeight}`
      });
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname) {
      Mixpanel.trackPageView(pathname);
    }
  }, [pathname]);

  return null;
}
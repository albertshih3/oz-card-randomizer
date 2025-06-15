'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '../lib/gtag';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (gtag.GA_TRACKING_ID) {
      const url = new URL(window.location.href);
      gtag.pageview(url);
    }
  }, [pathname, searchParams]);

  return null;
}
'use client';

import type { ReactNode } from 'react';
import { useClaimSimple, useSiteView } from './SiteViewProvider';

/* One page, two compositions. Only the active one is mounted, so there is one header, one main
 * and one footer in the document at a time. */
export default function PageViews({ consoleView, simpleView }: { consoleView: ReactNode; simpleView?: ReactNode }) {
  useClaimSimple(simpleView !== undefined);
  return <>{useSiteView()?.view === 'simple' && simpleView !== undefined ? simpleView : consoleView}</>;
}

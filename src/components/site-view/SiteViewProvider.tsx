'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Welcome, { type WelcomeCopy } from './Welcome';
import { SV_KEY } from './config';
import './sv-tokens.css';
import './simple.css';

/* THE VIEW AUTHORITY. Console is the default for a clean visitor. A valid ?view= wins over the
 * saved choice, and a valid explicit choice is saved. Every storage access is wrapped, because a
 * private window can throw on read. */
export type SiteView = 'console' | 'simple';
/* `view` is what the page shows: Simple only when the reader chose Simple AND this route has a
 * Simple body. `chosen` is the saved choice, kept so the next route with a Simple body opens in it. */
type Mode = { view: SiteView; chosen: SiteView; hasSimple: boolean; choose: (view: SiteView) => void; welcome: () => void; claimSimple: (path: string) => () => void };

const Context = createContext<Mode | null>(null);
export function useSiteView() {
  return useContext(Context);
}

/* A component that renders a Simple body for this route calls this. A route that never claims
 * Simple stays in Console whatever was chosen, so the chrome always matches the body. */
export function useClaimSimple(active = true) {
  const claim = useContext(Context)?.claimSimple;
  const path = usePathname();
  useEffect(() => (active && claim ? claim(path) : undefined), [active, claim, path]);
}

const VIEW_KEY = `${SV_KEY}:view`;
export const WELCOME_EVENT = `${SV_KEY}:welcome`;

/* DRAFTS LIVE IN MEMORY, above both views, so a value typed in one view is still there after a
 * switch or a route change. They are never written to storage. Outside the provider the hook
 * falls back to local state. */
type Drafts = { drafts: Record<string, unknown>; set: (key: string, value: unknown) => void };
const DraftContext = createContext<Drafts | null>(null);
export function useDraft<T>(key: string, initial: T): [T, (value: T) => void] {
  const ctx = useContext(DraftContext);
  const [local, setLocal] = useState<T>(initial);
  const shared = ctx?.set;
  const set = useCallback((v: T) => (shared ? shared(key, v) : setLocal(v)), [shared, key]);
  if (!ctx) return [local, set];
  return [(key in ctx.drafts ? ctx.drafts[key] : initial) as T, set];
}

export default function SiteViewProvider({ children, welcome: copy }: { children: ReactNode; welcome: WelcomeCopy }) {
  const [chosen, setView] = useState<SiteView>('console');
  const [claims, setClaims] = useState<Record<string, number>>({});
  const path = usePathname();

  const claimSimple = useCallback((claimed: string) => {
    setClaims((c) => ({ ...c, [claimed]: (c[claimed] || 0) + 1 }));
    return () => setClaims((c) => {
      const next = { ...c, [claimed]: (c[claimed] || 1) - 1 };
      if (next[claimed] <= 0) delete next[claimed];
      return next;
    });
  }, []);
  const hasSimple = (claims[path] || 0) > 0;
  const view: SiteView = chosen === 'simple' && hasSimple ? 'simple' : 'console';

  const choose = useCallback((next: SiteView) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
    const url = new URL(window.location.href);
    if (url.searchParams.has('view')) {
      url.searchParams.set('view', next);
      window.history.replaceState(window.history.state, '', url.href);
    }
  }, []);

  useEffect(() => {
    const explicit = new URLSearchParams(window.location.search).get('view');
    if (explicit === 'simple' || explicit === 'console') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the ?view= choice is only readable after hydration
      choose(explicit);
      return;
    }
    let saved: string | null = null;
    try { saved = localStorage.getItem(VIEW_KEY); } catch {}
    setView(saved === 'simple' ? 'simple' : 'console');
  }, [path, choose]);

  const welcome = useCallback(() => window.dispatchEvent(new Event(WELCOME_EVENT)), []);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const setDraft = useCallback((key: string, value: unknown) => setDrafts((d) => ({ ...d, [key]: value })), []);
  const draftValue = useMemo(() => ({ drafts, set: setDraft }), [drafts, setDraft]);

  return (
    <Context.Provider value={{ view, chosen, hasSimple, choose, welcome, claimSimple }}>
      <DraftContext.Provider value={draftValue}>
        <div className="sv-surface" data-view={view}>{children}</div>
      </DraftContext.Provider>
      <Welcome {...copy} />
    </Context.Provider>
  );
}

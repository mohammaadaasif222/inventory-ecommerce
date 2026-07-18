'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { useTheme as useColorMode } from 'next-themes';
import { config as appConfig } from '@/lib/config';
import { useAuthStore } from '@/store/auth-store';
import {
  applyCustomizations,
  themeStyleVars,
  type AppliedTheme,
  type LayoutTokens,
  type ThemeCustomizations,
} from '../config';
import { cn } from '@/lib/utils';

const ThemeContext = createContext<AppliedTheme | null>(null);

/**
 * The theme as rendered — package config with the merchant's customisations
 * applied, and, inside a preview window, with the admin's unsaved draft on top.
 *
 * Throws outside the provider rather than returning a default: a template
 * silently rendering neutral tokens is far harder to spot than a stack trace.
 */
export function useTheme(): AppliedTheme {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error(
      'useTheme() must be called inside <ThemeRuntime>. Templates and slots ' +
        'only render beneath the storefront layout, which provides it.',
    );
  }
  return value;
}

/**
 * Structure and density for the active theme.
 *
 * Components read these fields instead of branching on a theme slug — the one
 * rule that keeps a new theme from needing edits scattered across the
 * storefront.
 */
export function useLayout(): LayoutTokens {
  return useTheme().layout;
}

/**
 * Live theme switching for shoppers.
 *
 * On `theme_changed` the server has already flipped the active slug and
 * dropped its cache, so a refresh re-runs the server layout and the resolver
 * returns the new theme's templates. `router.refresh()` rather than a reload:
 * it re-fetches server components while keeping cart state and scroll position,
 * so a shopper mid-checkout sees a re-skin, not a reset.
 */
function useLiveThemeSwitch(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io(`${appConfig.socketUrl}/theme`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => socket.emit('join_storefront'));
    // Refresh on any published change, not just a slug change: saving the
    // customiser re-skins the live theme in place and must reach shoppers too.
    socket.on('theme_changed', () => router.refresh());

    return () => {
      socket.disconnect();
    };
  }, [enabled, router]);
}

/**
 * Draft sync for the admin's preview window.
 *
 * The customiser streams `preview_update` as controls move; this applies them
 * locally without persisting anything. Only the admin's own preview room
 * receives them, so no shopper can see an unpublished draft.
 *
 * Returns the draft overrides, or null when not previewing.
 */
function usePreviewDraft(sessionId: string | null): {
  slug: string | null;
  customizations: ThemeCustomizations | null;
} {
  const [draft, setDraft] = useState<{
    slug: string | null;
    customizations: ThemeCustomizations | null;
  }>({ slug: null, customizations: null });
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!sessionId || !token) return;

    const socket: Socket = io(`${appConfig.socketUrl}/theme`, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => socket.emit('join_preview', { sessionId }));
    socket.on(
      'preview_update',
      (payload: { slug: string; customizations?: ThemeCustomizations }) => {
        setDraft({
          slug: payload.slug,
          customizations: payload.customizations ?? {},
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [sessionId, token]);

  return draft;
}

/**
 * Applies the admin's default appearance as a *default* only.
 *
 * next-themes persists a visitor's own choice; if that key exists the visitor
 * has decided, and the merchant's default must not stomp it on every load.
 * Carried over from the provider this replaces — the reasoning still holds.
 */
function useAppearanceDefault(mode: string | undefined) {
  const { setTheme } = useColorMode();

  useEffect(() => {
    if (!mode || mode === 'system') return;
    try {
      if (window.localStorage.getItem('theme') === null) setTheme(mode);
    } catch {
      // Private mode / blocked storage: fall back to the provider default.
    }
  }, [mode, setTheme]);
}

/** Query param the admin's preview iframe carries. */
export const PREVIEW_PARAM = '__preview';

/**
 * Detect a preview session from the URL.
 *
 * Read from `window.location` in an effect rather than `useSearchParams()`:
 * that hook forces the whole subtree into a Suspense boundary and opts the
 * route out of static rendering, which is a heavy price on every storefront
 * page for a capability only the admin's iframe ever uses. Preview is
 * inherently post-hydration anyway — the drafts arrive over a socket.
 */
function usePreviewSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get(PREVIEW_PARAM);
    setSessionId(id);
  }, []);

  return sessionId;
}

export interface ThemeRuntimeProps {
  /** Resolved server-side, so the first byte is already the right theme. */
  theme: AppliedTheme;
  children: ReactNode;
}

/**
 * The storefront's theme root.
 *
 * Writes the active theme's tokens as CSS variables on a wrapper element, which
 * is what re-skins *everything* beneath it — including checkout, which reads
 * the same shadcn tokens as the rest of the UI and so can never fall back to an
 * unstyled default.
 *
 * Scoped to this element rather than `:root` so the admin panel, which renders
 * outside it, keeps its own neutral chrome whatever the shop is wearing.
 */
export function ThemeRuntime({ theme, children }: ThemeRuntimeProps) {
  const previewSessionId = usePreviewSession();
  const isPreview = Boolean(previewSessionId);
  const draft = usePreviewDraft(previewSessionId);

  // A live storefront must not also be a preview target, or a draft could leak
  // to shoppers through a shared socket.
  useLiveThemeSwitch(!isPreview);

  // In preview, the draft wins over the saved config; elsewhere there is none.
  const applied = useMemo(() => {
    if (!isPreview || !draft.customizations) return theme;
    return applyCustomizations(theme, draft.customizations);
  }, [isPreview, draft.customizations, theme]);

  useAppearanceDefault(applied.appearance);

  // Both palettes ship on every render as `--light-*` / `--dark-*`; the rules
  // in globals.css bind one of them to the shadcn tokens. See `themeStyleVars`.
  const vars = useMemo(() => themeStyleVars(applied) as CSSProperties, [applied]);

  return (
    <ThemeContext.Provider value={applied}>
      <div
        data-theme={applied.slug}
        className={cn(
          'theme-root flex min-h-screen flex-col bg-background text-foreground',
          // Eases the swap when an admin publishes while a shopper is browsing.
          'transition-colors duration-300',
        )}
        style={vars}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

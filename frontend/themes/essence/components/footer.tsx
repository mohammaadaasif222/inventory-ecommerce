'use client';

import Link from 'next/link';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * Essence footer — a slot override, and the proof the slot system works.
 *
 * Where the shared StoreFooter is a link directory, this is a colophon: the
 * house signature on dark ink, one line of navigation, one of reassurance.
 * Resolved by the layout via `resolveSlot('footer')`; every other theme keeps
 * the shared footer because they simply don't ship this file.
 */
export default function EssenceFooter() {
  const layout = useLayout();
  const { name } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-background">
      <div className={cn(layout.container, 'py-14')}>
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="font-display text-2xl uppercase tracking-[0.4em]">
            {name}
          </p>
          <span className="block h-px w-16 bg-brand" aria-hidden />

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs uppercase tracking-[0.2em] text-background/70"
          >
            <Link href="/products" className="transition-colors hover:text-background">
              The collection
            </Link>
            <Link href="/blog" className="transition-colors hover:text-background">
              Journal
            </Link>
            <Link href="/help" className="transition-colors hover:text-background">
              Care &amp; help
            </Link>
            <Link href="/account" className="transition-colors hover:text-background">
              Account
            </Link>
          </nav>

          <p className="max-w-md text-xs leading-relaxed text-background/50">
            Every bottle leaves the atelier sealed and cased for transit.
            Authenticity guaranteed, discretion assumed.
          </p>

          <p className="text-[11px] tracking-widest text-background/40">
            © {year} {name}
          </p>
        </div>
      </div>
    </footer>
  );
}

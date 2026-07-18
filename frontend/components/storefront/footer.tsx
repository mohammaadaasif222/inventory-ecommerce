'use client';

import Link from 'next/link';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'All products', href: '/products' },
      { label: 'New in', href: '/products?sort=newest' },
      { label: 'Best sellers', href: '/products?sort=rating_desc' },
      { label: 'Saved', href: '/account/wishlist' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Your orders', href: '/orders' },
      { label: 'Your bag', href: '/cart' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'Delivery & returns', href: '/help' },
      { label: 'Contact us', href: '/help' },
    ],
  },
];

/**
 * Footer follows the layout: `minimal` is a centred wordmark, `columns` is a
 * link directory. The wordmark itself comes from the active theme.
 */
export function StoreFooter() {
  const layout = useLayout();
  const { name } = useTheme();
  const year = new Date().getFullYear();

  if (layout.footer === 'columns') {
    return (
      <footer className="mt-auto border-t">
        <div className={cn(layout.container, 'py-12')}>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-display text-xl uppercase tracking-[0.3em] text-foreground">
                {name}
              </p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Fragrance, made in small batches and shipped worldwide.
              </p>
            </div>
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
            © {year} {name} — built with NestJS + Next.js
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto border-t py-8 text-center text-sm text-muted-foreground">
      <p className="font-display text-lg uppercase tracking-[0.3em] text-foreground">
        {name}
      </p>
      <p className="mt-1">
        © {year} {name} — built with NestJS + Next.js
      </p>
    </footer>
  );
}

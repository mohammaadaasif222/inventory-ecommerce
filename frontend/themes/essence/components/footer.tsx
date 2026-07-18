'use client';

import Link from 'next/link';
import { Facebook, Instagram, Sparkles, Twitter } from 'lucide-react';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import { PAYMENT_BADGES } from '../lib';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', href: '/' },
      { label: 'All Products', href: '/products' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Bestsellers', href: '/products?sort=rating_desc' },
      { label: 'New Arrivals', href: '/products?sort=newest' },
      { label: 'The Collection', href: '/products' },
      { label: 'Journal', href: '/blog' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track Order', href: '/track' },
      { label: 'My Account', href: '/account' },
      { label: 'Delivery & Returns', href: '/help' },
      { label: 'FAQs', href: '/help' },
    ],
  },
];

/**
 * Essence footer — dark ground, brand block plus three link columns, social
 * icons, and a copyright bar with payment badges. A slot override; other
 * themes keep the shared StoreFooter.
 */
export default function EssenceFooter() {
  const layout = useLayout();
  const { name, logoUrl } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-background">
      <div className={cn(layout.container, 'grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]')}>
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold uppercase tracking-[0.18em]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} className="h-9 w-auto object-contain" />
            ) : (
              <>
                <Sparkles className="h-6 w-6 text-brand" aria-hidden />
                {name}
              </>
            )}
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-background/60">
            Every bottle leaves the atelier sealed and cased for transit.
            Authenticity guaranteed, discretion assumed.
          </p>
          <div className="flex items-center gap-3 pt-1">
            {[
              { Icon: Facebook, label: 'Facebook' },
              { Icon: Twitter, label: 'Twitter' },
              { Icon: Instagram, label: 'Instagram' },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background/10 transition-colors hover:bg-brand hover:text-brand-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3">
            <p className="font-display text-lg font-medium">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-background/60 transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-background/10">
        <div
          className={cn(
            layout.container,
            'flex flex-col items-center justify-between gap-3 py-5 text-xs text-background/50 sm:flex-row',
          )}
        >
          <p>
            Copyright © {year} {name} | Powered by {name}
          </p>
          <div className="flex items-center gap-1.5" aria-label="Accepted payment methods">
            {PAYMENT_BADGES.map((badge) => (
              <span
                key={badge}
                className="rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

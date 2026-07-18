'use client';

import Link from 'next/link';
import { Facebook, Instagram, Lamp, Twitter, Youtube } from 'lucide-react';
import {
  FOOTER_SETTINGS_KEY,
  usePublicSetting,
  type FooterColumn,
  type FooterSettings,
} from '@/hooks/use-config';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/** Shipped defaults — used until the admin saves their own footer. */
const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'New Arrivals', href: '/products?sort=newest' },
      { label: 'Bestsellers', href: '/products?sort=rating_desc' },
    ],
  },
  {
    title: 'Inspiration',
    links: [
      { label: 'Styling Journal', href: '/blog' },
      { label: 'About the House', href: '/about' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track Order', href: '/track' },
      { label: 'Contact', href: '/contact' },
      { label: 'Delivery & Returns', href: '/help' },
    ],
  },
];

const DEFAULT_ABOUT =
  'Pieces chosen slowly, made to be lived with — warm materials, honest craft, rooms that feel like yours.';

const SOCIAL_ICONS = [
  { key: 'facebook', Icon: Facebook, label: 'Facebook' },
  { key: 'twitter', Icon: Twitter, label: 'Twitter' },
  { key: 'instagram', Icon: Instagram, label: 'Instagram' },
  { key: 'youtube', Icon: Youtube, label: 'YouTube' },
] as const;

/**
 * Hearth footer — warm sand ground rather than dark ink: brand block, the
 * admin's footer columns (Website → Footer), social icons and a quiet
 * copyright line. Same data as the Essence footer, entirely different face.
 */
export default function DecorFooter() {
  const layout = useLayout();
  const { name, logoUrl } = useTheme();
  const settings = usePublicSetting<FooterSettings>(FOOTER_SETTINGS_KEY);
  const year = new Date().getFullYear();

  const columns = settings?.columns?.filter((c) => c.links.length > 0).length
    ? settings.columns.filter((c) => c.links.length > 0)
    : DEFAULT_COLUMNS;
  const about = settings?.aboutText?.trim() || DEFAULT_ABOUT;
  const copyright =
    settings?.copyrightText?.trim() || `© ${year} ${name}. Made for slow mornings.`;
  const socials = SOCIAL_ICONS.map(({ key, Icon, label }) => ({
    Icon,
    label,
    url: settings?.socials?.[key]?.trim() || null,
  })).filter((s) => (settings?.socials ? s.url : true));

  return (
    <footer className="mt-auto border-t bg-secondary text-secondary-foreground">
      <div className={cn(layout.container, 'grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]')}>
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={name} className="h-9 w-auto object-contain" />
            ) : (
              <>
                <Lamp className="h-6 w-6 text-brand" aria-hidden />
                {name}
              </>
            )}
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-secondary-foreground/70">
            {about}
          </p>
          {socials.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              {socials.map(({ Icon, label, url }) => (
                <a
                  key={label}
                  href={url ?? '#'}
                  target={url ? '_blank' : undefined}
                  rel={url ? 'noopener noreferrer' : undefined}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary-foreground/20 transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-3">
            <p className="font-display text-lg">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  {link.href.startsWith('/') ? (
                    <Link
                      href={link.href}
                      className="text-secondary-foreground/70 transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary-foreground/70 transition-colors hover:text-brand"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-secondary-foreground/10">
        <div className={cn(layout.container, 'py-5 text-center text-xs text-secondary-foreground/50')}>
          {copyright}
        </div>
      </div>
    </footer>
  );
}

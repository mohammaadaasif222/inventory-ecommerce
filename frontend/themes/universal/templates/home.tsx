'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { CategoryTiles } from '@/components/storefront/category-tiles';
import { OffersStrip } from '@/components/storefront/offers-strip';
import { Testimonials, type Testimonial } from '@/components/storefront/testimonials';
import { Newsletter } from '@/components/storefront/newsletter';
import type { HeroSlide } from '@/components/storefront/hero-carousel';
import {
  useHomepageSections,
  useProductsByIds,
  type HomepageSection,
} from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { HomeTemplateProps } from '@/themes/contract';

/**
 * Universal home — the commercial reading of the same builder sections.
 *
 * Base narrates; this one sells. One flat hero instead of a carousel, category
 * tiles straight beneath it, rails that link out to the full catalog, and the
 * countdown as a slim promo bar rather than a set piece.
 */
export default function HomeTemplate(_props: HomeTemplateProps) {
  const { data: sections, isLoading } = useHomepageSections();
  const { sectionOrder } = useTheme();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return <EmptyHome />;
  }

  return (
    <div className="flex flex-col">
      {applyOrder(sections, sectionOrder).map((section) => (
        <SectionRenderer key={section._id} section={section} />
      ))}
    </div>
  );
}

/**
 * Apply the customiser's drag-and-drop ordering.
 *
 * Sections absent from `order` keep their builder position at the end rather
 * than disappearing — a merchant who reorders three sections and later adds a
 * fourth should see the fourth, not lose it to a stale order array.
 */
function applyOrder(
  sections: HomepageSection[],
  order: string[],
): HomepageSection[] {
  if (order.length === 0) return sections;

  const rank = new Map(order.map((id, i) => [id, i]));
  return [...sections].sort((a, b) => {
    const ra = rank.get(a._id) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b._id) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

/**
 * One flat banner, not a carousel: a single unmissable offer converts better
 * than slides shoppers never wait for. When the builder authors several, the
 * first slide wins.
 */
function HeroBanner({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const cfg = section.config ?? {};
  const slides = Array.isArray(cfg.slides) ? (cfg.slides as HeroSlide[]) : [];
  const slide: HeroSlide = slides[0] ?? {
    heading: section.title || (cfg.heading as string) || 'Welcome',
    subheading: cfg.subheading as string | undefined,
    ctaLabel: (cfg.ctaLabel as string) || 'Shop now',
    ctaHref: (cfg.ctaHref as string) || '/products',
    image: cfg.image as string | undefined,
  };

  return (
    <section className="relative overflow-hidden bg-ink">
      {slide.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Scrim keeps the copy legible over any merchant photo. */}
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-ink/15" />
        </>
      ) : (
        // No image is a real state, not an error: the ink block with a brand
        // rule still reads as a designed banner.
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand" />
      )}

      <div
        className={cn(
          layout.container,
          'relative flex min-h-[360px] flex-col items-start justify-center gap-4 py-14 sm:min-h-[420px]',
        )}
      >
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
          {slide.heading}
        </h1>
        {slide.subheading ? (
          <p className="max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {slide.subheading}
          </p>
        ) : null}
        <Button
          asChild
          size="lg"
          className="mt-2 bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href={slide.ctaHref || '/products'}>
            {slide.ctaLabel || 'Shop now'}
          </Link>
        </Button>
      </div>
    </section>
  );
}

/** Rails come from the admin builder as product ids; fetch and render them. */
function FeaturedRail({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const cfg = section.config ?? {};
  const ids = Array.isArray(cfg.productIds) ? (cfg.productIds as string[]) : [];
  const { data: products } = useProductsByIds(ids);

  if (!products || products.length === 0) return null;

  // Preserve the order the admin configured, not the API's.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof products;

  return (
    <section className={cn(layout.container, layout.sectionPadding)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {section.title || 'Featured'}
          </h2>
          {cfg.subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {String(cfg.subtitle)}
            </p>
          ) : null}
        </div>
        <Link
          href="/products"
          className="flex shrink-0 items-center gap-0.5 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Native scroll-snap rather than a carousel: the scrollbar is honest
          about how much there is, and "View all" does the rest. */}
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {ordered.map((p) => (
          <div
            key={p.id}
            className="min-w-0 flex-[0_0_60%] snap-start sm:flex-[0_0_35%] md:flex-[0_0_26%] lg:flex-[0_0_19%]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function remainingUntil(target: number): Remaining {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The countdown as a slim ticker line — urgency without a set-piece banner. */
function PromoBar({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const cfg = section.config ?? {};
  const target = new Date(String(cfg.endsAt ?? '')).getTime();
  // Start null so server and first client render agree; fill in after mount.
  const [left, setLeft] = useState<Remaining | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setLeft(remainingUntil(target));
    const t = setInterval(() => setLeft(remainingUntil(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (Number.isNaN(target) || left?.done) return null;

  return (
    // White over ink, matching every other ink surface: ink is dark by
    // contract in both colour modes, so the bar stays legible re-branded.
    <section className="bg-ink text-white">
      <div
        className={cn(
          layout.container,
          'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2.5 text-sm',
        )}
      >
        <p className="font-medium">{section.title || 'Limited time'}</p>
        {cfg.subtitle ? (
          <p className="hidden text-white/70 sm:block">{String(cfg.subtitle)}</p>
        ) : null}
        <span
          className="font-semibold tabular-nums text-brand"
          suppressHydrationWarning
        >
          {left
            ? `${left.days > 0 ? `${left.days}d ` : ''}${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`
            : ''}
        </span>
        {cfg.ctaLabel ? (
          <Link
            href={(cfg.ctaHref as string) || '/products'}
            className="font-medium underline underline-offset-4 transition-colors hover:text-brand"
          >
            {String(cfg.ctaLabel)}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function SectionRenderer({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const cfg = section.config ?? {};

  switch (section.type) {
    case 'hero_banner':
      return (
        <>
          <HeroBanner section={section} />
          {/* Category routes are the strongest second click on a store that
              sells anything; keep them one scroll from the hero. */}
          <CategoryTiles />
        </>
      );

    case 'featured_products':
      return <FeaturedRail section={section} />;

    case 'countdown_timer':
      return (
        <>
          <PromoBar section={section} />
          <OffersStrip />
        </>
      );

    case 'testimonials':
      return (
        <Testimonials
          title={section.title || 'What people say'}
          items={Array.isArray(cfg.items) ? (cfg.items as Testimonial[]) : []}
        />
      );

    case 'newsletter':
      return (
        <Newsletter
          title={section.title || 'Join our newsletter'}
          text={(cfg.text as string) || 'Get the latest drops and offers.'}
        />
      );

    case 'custom_html':
      return (
        <section
          className={cn(layout.container, 'py-6')}
          // Admin-authored content; trusted CMS field.
          dangerouslySetInnerHTML={{ __html: String(cfg.html ?? '') }}
        />
      );

    default:
      return null;
  }
}

/** Shown when the builder has no sections yet — a real state, not a fallback. */
function EmptyHome() {
  const { name } = useTheme();
  const layout = useLayout();

  return (
    <section className="border-b bg-muted/40 py-20 text-center">
      <div className={cn(layout.container, 'space-y-4')}>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {name}
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          This storefront renders homepage sections from the admin builder. Add
          some in the admin panel, or browse the catalog.
        </p>
        <Button
          asChild
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroCarousel, type HeroSlide } from '@/components/storefront/hero-carousel';
import { ProductRail } from '@/components/storefront/product-rail';
import { CountdownBanner } from '@/components/storefront/countdown-banner';
import { OffersStrip } from '@/components/storefront/offers-strip';
import { Testimonials, type Testimonial } from '@/components/storefront/testimonials';
import { Newsletter } from '@/components/storefront/newsletter';
import { CategoryTiles } from '@/components/storefront/category-tiles';
import {
  useHomepageSections,
  useProductsByIds,
  type HomepageSection,
} from '@/hooks/use-storefront';
import { useTheme } from '@/themes/runtime/theme-runtime';
import type { HomeTemplateProps } from '@/themes/contract';

/**
 * Base home — renders the admin's homepage-builder sections in order.
 *
 * The section *types* are core (the builder writes them); how each one looks is
 * the theme's business. This implementation is the neutral one: Essence and
 * Universal override this template to tell their own story with the same data.
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

/** Rails come from the admin builder as product ids; fetch and render them. */
function FeaturedRail({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};
  const ids = Array.isArray(cfg.productIds) ? (cfg.productIds as string[]) : [];
  const { data: products } = useProductsByIds(ids);

  if (!products || products.length === 0) return null;

  // Preserve the order the admin configured, not the API's.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof products;

  return (
    <ProductRail
      title={section.title || 'Featured'}
      subtitle={cfg.subtitle as string | undefined}
      products={ordered}
    />
  );
}

function SectionRenderer({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};

  switch (section.type) {
    case 'hero_banner': {
      const slides = Array.isArray(cfg.slides) ? (cfg.slides as HeroSlide[]) : [];
      // Fall back to a single slide built from flat config keys.
      const resolved: HeroSlide[] =
        slides.length > 0
          ? slides
          : [
              {
                heading: section.title || (cfg.heading as string) || 'Welcome',
                subheading: cfg.subheading as string | undefined,
                ctaLabel: (cfg.ctaLabel as string) || 'Shop now',
                ctaHref: (cfg.ctaHref as string) || '/products',
                image: cfg.image as string | undefined,
              },
            ];
      return (
        <>
          <HeroCarousel
            slides={resolved}
            autoplayMs={(cfg.autoplayMs as number) ?? 6000}
          />
          <CategoryTiles />
        </>
      );
    }

    case 'featured_products':
      return <FeaturedRail section={section} />;

    case 'countdown_timer':
      return (
        <>
          <CountdownBanner
            title={section.title || 'Limited time'}
            subtitle={cfg.subtitle as string | undefined}
            endsAt={String(cfg.endsAt ?? '')}
            ctaLabel={cfg.ctaLabel as string | undefined}
            ctaHref={cfg.ctaHref as string | undefined}
          />
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
          className="container py-8"
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

  return (
    <section className="bg-muted/30 py-24 text-center">
      <div className="container space-y-4">
        <h1 className="font-display text-5xl font-medium tracking-tight">
          {name}
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          This storefront renders homepage sections from the admin builder. Add
          some in the admin panel, or browse the catalog.
        </p>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    </section>
  );
}

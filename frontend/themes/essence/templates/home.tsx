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
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import {
  useHomepageSections,
  useProductsByIds,
  useCategories,
  useStorefrontProducts,
  type Category,
  type HomepageSection,
} from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { HomeTemplateProps } from '@/themes/contract';

/**
 * Essence home — a fragrance house's front door.
 *
 * Renders the same builder sections as base, but paced like an editorial: a
 * full-bleed hero, a "notes" storytelling band explaining the top/heart/base
 * pyramid, scent-family tiles, and rails with generous whitespace. The data is
 * identical to every other theme's home — only the telling differs.
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

  if (!sections || sections.length === 0) return <EmptyHome />;

  const ordered = applyOrder(sections, sectionOrder);
  // The storytelling band slots after the hero (or leads if there is none) —
  // it is part of the theme's voice, not a builder section the admin manages.
  const heroIndex = ordered.findIndex((s) => s.type === 'hero_banner');

  return (
    <div className="flex flex-col">
      {ordered.map((section, i) => (
        <div key={section._id}>
          <SectionRenderer section={section} />
          {i === Math.max(heroIndex, 0) && <NotesStory />}
        </div>
      ))}
      <GalleryStrip />
    </div>
  );
}

/** Same semantics as base: absent ids keep their builder position at the end. */
function applyOrder(
  sections: HomepageSection[],
  order: string[],
): HomepageSection[] {
  if (order.length === 0) return sections;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...sections].sort(
    (a, b) =>
      (rank.get(a._id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b._id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/**
 * The pyramid, told as copy: what a fragrance's notes *are*.
 *
 * Static by design. It teaches the vocabulary the product pages then use
 * (top/heart/base), and that framing is the theme's editorial voice rather
 * than merchant content.
 */
function NotesStory() {
  const layout = useLayout();

  const stages = [
    {
      phase: 'Top',
      window: 'The first fifteen minutes',
      copy: 'The opening impression — citrus, spice, something green. Bright, volatile, and gone before you stop noticing it.',
    },
    {
      phase: 'Heart',
      window: 'The first few hours',
      copy: 'The character of the fragrance. Florals, woods and resins that emerge as the opening lifts, and carry the scent through its day.',
    },
    {
      phase: 'Base',
      window: 'Until the end',
      copy: 'What lingers on skin and collar — oud, amber, musk. The memory the fragrance leaves behind.',
    },
  ];

  return (
    <section className="bg-ink text-background">
      <div className={cn(layout.container, 'py-20')}>
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-brand">
            How to read a fragrance
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-snug sm:text-4xl">
            Every scent is a story in three acts
          </h2>
        </Reveal>

        <RevealGroup className="mx-auto mt-14 grid max-w-4xl gap-10 sm:grid-cols-3">
          {stages.map((stage, i) => (
            <RevealItem key={stage.phase}>
              <div className="text-center">
                {/* The pyramid, abstracted: a narrowing rule per act. */}
                <span
                  className="mx-auto block h-px bg-brand"
                  style={{ width: `${72 - i * 22}%` }}
                  aria-hidden
                />
                <h3 className="mt-5 font-display text-xl">{stage.phase} notes</h3>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-background/50">
                  {stage.window}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-background/75">
                  {stage.copy}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/**
 * Scent families from the live category tree — the fragrance analogue of
 * category tiles, styled as an editorial index rather than a grid of cards.
 */
function FamilyIndex() {
  const layout = useLayout();
  const { data: categories } = useCategories();

  // The API returns a tree. Leaves read as families (Floral, Woody, Oud…);
  // inner nodes are navigation groupings. Fall back to the roots if the tree
  // is flat.
  const leaves: Category[] = [];
  const walk = (nodes: Category[]) => {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children);
      else leaves.push(node);
    }
  };
  walk(categories ?? []);
  const families = (leaves.length > 0 ? leaves : categories ?? []).slice(0, 6);

  if (families.length === 0) return null;

  return (
    <section className={cn(layout.container, 'py-16')}>
      <Reveal className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-brand">
          The families
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium">
          Find your register
        </h2>
      </Reveal>
      <RevealGroup className="mx-auto mt-10 grid max-w-3xl gap-x-12 gap-y-6 sm:grid-cols-2">
        {families.map((family) => (
          <RevealItem key={family.id}>
            <Link
              href={`/products?categoryId=${family.id}`}
              className="group flex items-baseline justify-between border-b border-border pb-3 transition-colors hover:border-brand"
            >
              <span className="font-display text-xl transition-colors group-hover:text-brand">
                {family.name}
              </span>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Explore
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/**
 * Instagram-style gallery strip — the theme's closing image.
 *
 * Product photography from the newest pieces, six squares edge to edge, each
 * linking to its product. Data, not a social embed: an embed would need an
 * external script the CSP should not carry, and the catalog's own imagery is
 * the point — the "feed" is the shop.
 */
function GalleryStrip() {
  const { data } = useStorefrontProducts({ page: 1, sort: 'newest' });

  const tiles = (data?.data ?? [])
    .filter((p) => p.images?.[0]?.url)
    .slice(0, 6);

  if (tiles.length < 3) return null;

  return (
    <section aria-label="From the house" className="pb-0">
      <div className="py-10 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-brand">
          From the house
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          The latest compositions, as they leave the atelier
        </p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {tiles.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            aria-label={product.name}
            className="group relative aspect-square overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0].url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-end bg-ink/0 p-3 opacity-0 transition-all duration-300 group-hover:bg-ink/50 group-hover:opacity-100">
              <span className="font-display text-sm text-white">
                {product.name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedRail({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};
  const ids = Array.isArray(cfg.productIds) ? (cfg.productIds as string[]) : [];
  const { data: products } = useProductsByIds(ids);

  if (!products || products.length === 0) return null;

  // Preserve the order the admin configured, not the API's.
  const byId = new Map(products.map((p) => [p.id, p]));
  const orderedProducts = ids
    .map((id) => byId.get(id))
    .filter(Boolean) as typeof products;

  return (
    <ProductRail
      title={section.title || 'Featured'}
      subtitle={cfg.subtitle as string | undefined}
      products={orderedProducts}
    />
  );
}

function SectionRenderer({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};

  switch (section.type) {
    case 'hero_banner': {
      const slides = Array.isArray(cfg.slides) ? (cfg.slides as HeroSlide[]) : [];
      const resolved: HeroSlide[] =
        slides.length > 0
          ? slides
          : [
              {
                heading: section.title || (cfg.heading as string) || 'Welcome',
                subheading: cfg.subheading as string | undefined,
                ctaLabel: (cfg.ctaLabel as string) || 'Discover',
                ctaHref: (cfg.ctaHref as string) || '/products',
                image: cfg.image as string | undefined,
              },
            ];
      return (
        <>
          <HeroCarousel
            slides={resolved}
            autoplayMs={(cfg.autoplayMs as number) ?? 7000}
          />
          <FamilyIndex />
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
          title={section.title || 'Worn and loved'}
          items={Array.isArray(cfg.items) ? (cfg.items as Testimonial[]) : []}
        />
      );

    case 'newsletter':
      return (
        <Newsletter
          title={section.title || 'From the atelier'}
          text={
            (cfg.text as string) ||
            'New compositions, limited editions and notes from the house — occasionally, and worth opening.'
          }
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

function EmptyHome() {
  const { name } = useTheme();

  return (
    <section className="bg-muted/30 py-28 text-center">
      <div className="container space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-brand">
          The house of
        </p>
        <h1 className="font-display text-5xl font-medium tracking-tight">
          {name}
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          The homepage tells its story from sections in the admin builder. Add a
          hero and a featured rail, or step into the collection.
        </p>
        <Button asChild variant="outline">
          <Link href="/products">Enter the collection</Link>
        </Button>
      </div>
    </section>
  );
}

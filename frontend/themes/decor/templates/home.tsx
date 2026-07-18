'use client';

import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { CountdownBanner } from '@/components/storefront/countdown-banner';
import { OffersStrip } from '@/components/storefront/offers-strip';
import { Testimonials, type Testimonial } from '@/components/storefront/testimonials';
import { Newsletter } from '@/components/storefront/newsletter';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import type { HeroSlide } from '@/components/storefront/hero-carousel';
import {
  useArticles,
  useCatalogScope,
  useHomepageSections,
  useProductsByIds,
  useStorefrontProducts,
  type HomepageSection,
} from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { HomeTemplateProps } from '@/themes/contract';

/**
 * Hearth home — inspiration first, catalog second.
 *
 * A full-bleed lifestyle hero, room-by-room browsing from the scope's child
 * categories, a scoped new-in rail, and a styling-journal teaser pulled from
 * the blog. Renders the same builder sections as every theme; the voice
 * between them is the theme's own.
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
  const heroIndex = ordered.findIndex((s) => s.type === 'hero_banner');

  return (
    <div className="flex flex-col">
      {ordered.map((section, i) => (
        <div key={section._id}>
          <SectionRenderer section={section} />
          {i === Math.max(heroIndex, 0) && (
            <>
              <ShopByRoom />
              <NewForTheHome />
              <LifestyleBanner />
            </>
          )}
        </div>
      ))}
      <JournalTeaser />
    </div>
  );
}

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

function SectionHeadline({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-brand">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{title}</h2>
    </Reveal>
  );
}

/** Full-bleed lifestyle photograph, serif copy on a soft card. */
function LifestyleHero({ slide }: { slide: HeroSlide }) {
  return (
    <section className="relative h-[480px] sm:h-[560px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.image || 'https://picsum.photos/seed/hearth-hero/1800/900'}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/50 via-ink/20 to-transparent" />
      <Reveal className="absolute inset-y-0 left-0 flex items-center">
        <div className="max-w-lg space-y-5 px-6 text-white sm:px-14">
          <h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
            {slide.heading}
          </h1>
          {slide.subheading ? (
            <p className="text-sm leading-relaxed text-white/85">{slide.subheading}</p>
          ) : null}
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href={slide.ctaHref || '/products'}>
              {slide.ctaLabel || 'Shop the collection'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}

/** Room tiles from the scope's children — the theme's signature navigation. */
function ShopByRoom() {
  const layout = useLayout();
  const scope = useCatalogScope();
  const rooms = scope.children.slice(0, 4);

  if (rooms.length === 0) return null;

  return (
    <section className={cn(layout.container, 'py-16')}>
      <SectionHeadline eyebrow="Room by room" title="Shop the way you live" />
      <RevealGroup className="grid gap-5 sm:grid-cols-2">
        {rooms.map((room) => (
          <RevealItem key={room.id}>
            <Link
              href={`/products?categoryId=${room.id}`}
              className="group relative block aspect-[16/9] overflow-hidden rounded-[var(--radius)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  room.imageUrl ||
                  `https://picsum.photos/seed/hearth-${room.slug}/900/520`
                }
                alt=""
                aria-hidden
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <span className="absolute bottom-5 left-5 font-display text-2xl text-white">
                Shop the {room.name}
                <ArrowRight className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function NewForTheHome() {
  const layout = useLayout();
  const scope = useCatalogScope();
  const { data } = useStorefrontProducts({
    page: 1,
    sort: 'newest',
    categoryId: scope.id,
  });
  const products = (data?.data ?? []).slice(0, 4);

  if (products.length === 0) return null;

  return (
    <section className="bg-secondary/50">
      <div className={cn(layout.container, 'py-16')}>
        <SectionHeadline eyebrow="Just landed" title="New for the home" />
        <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {products.map((p, i) => (
            <RevealItem key={p.id}>
              <ProductCard product={p} priority={i < 4} />
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link href="/products">Browse everything</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Wide shoppable lifestyle break between the grids. */
function LifestyleBanner() {
  const scope = useCatalogScope();
  const { data } = useStorefrontProducts({
    page: 1,
    sort: 'rating_desc',
    categoryId: scope.id,
  });
  const hero = data?.data?.[0];

  return (
    <section className="relative h-72 sm:h-96">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://picsum.photos/seed/hearth-lifestyle/1800/700"
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/40" />
      <Reveal className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <p className="font-display text-3xl font-medium sm:text-4xl">
          Rooms that feel like you
        </p>
        <Button asChild className="rounded-full px-8">
          <Link href={hero ? `/products/${hero.slug}` : '/products'}>
            Shop the look
          </Link>
        </Button>
      </Reveal>
    </section>
  );
}

/** Styling-journal teaser from the blog — the editorial block. */
function JournalTeaser() {
  const layout = useLayout();
  const { data: posts } = useArticles('post');
  const teasers = (posts ?? []).slice(0, 3);

  if (teasers.length === 0) return null;

  return (
    <section className={cn(layout.container, 'py-16')}>
      <SectionHeadline eyebrow="The journal" title="Styling notes" />
      <RevealGroup className="grid gap-6 md:grid-cols-3">
        {teasers.map((post) => (
          <RevealItem key={post._id}>
            <Link href={`/blog/${post.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/hearth-post-${post.slug}/700/520`}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-4 font-display text-xl leading-snug transition-colors group-hover:text-brand">
                {post.title}
              </h3>
              {post.excerpt ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
              ) : null}
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function FeaturedGrid({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const cfg = section.config ?? {};
  const ids = Array.isArray(cfg.productIds) ? (cfg.productIds as string[]) : [];
  const { data: products } = useProductsByIds(ids);

  if (!products || products.length === 0) return null;

  const byId = new Map(products.map((p) => [p.id, p]));
  const orderedProducts = ids
    .map((id) => byId.get(id))
    .filter(Boolean) as typeof products;

  return (
    <section className={cn(layout.container, 'py-16')}>
      <SectionHeadline eyebrow="Curated" title={section.title || 'Pieces we love'} />
      <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {orderedProducts.slice(0, 8).map((p) => (
          <RevealItem key={p.id}>
            <ProductCard product={p} />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function SectionRenderer({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};

  switch (section.type) {
    case 'hero_banner': {
      const slides = Array.isArray(cfg.slides) ? (cfg.slides as HeroSlide[]) : [];
      const slide: HeroSlide = slides[0] ?? {
        heading: section.title || (cfg.heading as string) || 'Welcome home',
        subheading: cfg.subheading as string | undefined,
        ctaLabel: (cfg.ctaLabel as string) || 'Shop the collection',
        ctaHref: (cfg.ctaHref as string) || '/products',
        image: cfg.image as string | undefined,
      };
      return <LifestyleHero slide={slide} />;
    }

    case 'featured_products':
      return <FeaturedGrid section={section} />;

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
          title={section.title || 'At home with our customers'}
          items={Array.isArray(cfg.items) ? (cfg.items as Testimonial[]) : []}
        />
      );

    case 'newsletter':
      return (
        <Newsletter
          title={section.title || 'Notes from the house'}
          text={
            (cfg.text as string) ||
            'Styling ideas, new arrivals and slow-living notes — monthly, and worth the read.'
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
    <section className="bg-secondary/60 py-28 text-center">
      <div className="container space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-brand">Welcome to</p>
        <h1 className="font-display text-5xl font-medium tracking-tight">{name}</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          The homepage builds from sections in the admin. Add a hero and a
          featured rail, or browse the collection room by room.
        </p>
        <Button asChild className="rounded-full px-8">
          <Link href="/products">Shop the collection</Link>
        </Button>
      </div>
    </section>
  );
}

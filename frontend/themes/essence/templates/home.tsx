'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from 'framer-motion';
import {
  ArrowRight,
  BadgePercent,
  Instagram,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { CountdownBanner } from '@/components/storefront/countdown-banner';
import { OffersStrip } from '@/components/storefront/offers-strip';
import { Newsletter } from '@/components/storefront/newsletter';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import type { HeroSlide } from '@/components/storefront/hero-carousel';
import type { Testimonial } from '@/components/storefront/testimonials';
import { useOffers } from '@/hooks/use-coupons';
import {
  useCategories,
  useHomepageSections,
  useProductsByIds,
  useStorefrontProducts,
  type HomepageSection,
} from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { Product } from '@/schemas/product.schema';
import type { HomeTemplateProps } from '@/themes/contract';

/**
 * Essence home — boutique storefront pacing on teal and mint.
 *
 * Renders the admin's builder sections like every theme, and interleaves the
 * theme's own voice: an overlay hero, explore tiles, a promo banner from live
 * offers, new arrivals, craft storytelling, a stats band, an Instagram-style
 * gallery and a benefits row. Data is identical to other themes' home — only
 * the telling differs.
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
  // The theme's own bands slot after the hero (or lead if there is none).
  const heroIndex = ordered.findIndex((s) => s.type === 'hero_banner');

  return (
    <div className="flex flex-col">
      {ordered.map((section, i) => (
        <div key={section._id}>
          <SectionRenderer section={section} />
          {i === Math.max(heroIndex, 0) && <ThemeVoice />}
        </div>
      ))}
      <InstagramStrip />
      <BenefitsRow />
    </div>
  );
}

/** The bands that are the theme's voice rather than builder content. */
function ThemeVoice() {
  return (
    <>
      <PromoBanner />
      <NewArrivals />
      <CraftStory />
      <StatsBand />
    </>
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

/** Uppercase tracking CTA the demo uses everywhere. */
function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild className="h-auto px-6 py-2.5 text-xs font-semibold uppercase tracking-widest">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="mb-10 text-center">
      <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}

/**
 * Full-width image with the teal message panel overlapping on the left.
 * The image drifts in a slow Ken Burns zoom; the panel slides in from the
 * left. Both hold still for reduced-motion visitors.
 */
function OverlayHero({ slide }: { slide: HeroSlide }) {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <div className="ml-auto w-full overflow-hidden lg:w-[82%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          src={slide.image || 'https://picsum.photos/seed/essence-hero/1600/700'}
          alt=""
          animate={reduced ? undefined : { scale: [1, 1.07] }}
          transition={{
            duration: 16,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'linear',
          }}
          className="h-[420px] w-full object-cover sm:h-[480px]"
        />
      </div>
      <motion.div
        initial={reduced ? false : { opacity: 0, x: -48 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="bg-primary p-8 text-primary-foreground sm:p-10 lg:absolute lg:left-0 lg:top-1/2 lg:max-w-md lg:-translate-y-1/2 lg:p-12"
      >
        <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
          {slide.heading}
        </h1>
        {slide.subheading ? (
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/85">
            {slide.subheading}
          </p>
        ) : null}
        <Button
          asChild
          className="group mt-6 h-auto bg-background px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-background/90"
        >
          <Link href={slide.ctaHref || '/products'}>
            {slide.ctaLabel || 'Shop now'}
            <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}

/** Wide "Explore <category> →" tiles from the live top-level categories. */
function ExploreTiles() {
  const layout = useLayout();
  const { data: categories } = useCategories();
  const tiles = (categories ?? []).slice(0, 2);

  if (tiles.length === 0) return null;

  return (
    <section className={cn(layout.container, 'pt-14')}>
      <RevealGroup className="grid gap-5 sm:grid-cols-2">
        {tiles.map((category) => (
          <RevealItem key={category.id}>
            <Link
              href={`/products?categoryId=${category.id}`}
              className="group relative block aspect-[16/8] overflow-hidden rounded-[var(--radius)] bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/essence-${category.slug}/900/460`}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute left-5 top-5 flex items-center gap-2 rounded-sm bg-background/90 px-4 py-2 text-sm font-medium shadow-sm transition-colors group-hover:bg-background">
                Explore {category.name}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/**
 * Live offers as the demo's mint promo banner. Hidden without any. With more
 * than one offer the headline rotates every few seconds; the product image
 * floats on a slow bob so the card reads as alive even with a single offer.
 */
function PromoBanner() {
  const layout = useLayout();
  const reduced = useReducedMotion();
  const { data: offers } = useOffers();
  const { data: newest } = useStorefrontProducts({ page: 1, sort: 'newest' });
  const [index, setIndex] = useState(0);

  const rotating = (offers ?? []).slice(0, 4);

  useEffect(() => {
    if (reduced || rotating.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % rotating.length),
      4500,
    );
    return () => clearInterval(timer);
  }, [reduced, rotating.length]);

  const offer = rotating[index % Math.max(1, rotating.length)];
  if (!offer) return null;

  const headline =
    offer.type === 'PERCENT'
      ? `${offer.value}% OFF`
      : offer.type === 'FIXED'
        ? `₹${offer.value} OFF`
        : 'FREE SHIPPING';
  const image = newest?.data?.[1]?.images?.[0]?.url;

  return (
    <section className={cn(layout.container, 'pt-14')}>
      <Reveal className="relative overflow-hidden rounded-[var(--radius)] bg-secondary">
        <div className="flex items-center justify-between gap-6">
          <div className="p-8 sm:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={offer.code}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                <p className="flex items-center gap-2 font-display text-3xl font-semibold sm:text-4xl">
                  {headline}
                  <span className="relative flex h-2.5 w-2.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                  </span>
                </p>
                <p className="text-sm text-secondary-foreground/80">
                  {offer.description || `Use code ${offer.code} at checkout`}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex items-center gap-3">
              <CtaButton href="/products">Shop now</CtaButton>
              {rotating.length > 1 && (
                <span className="flex gap-1.5" aria-hidden>
                  {rotating.map((o, i) => (
                    <span
                      key={o.code}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        i === index % rotating.length
                          ? 'bg-brand'
                          : 'bg-secondary-foreground/25',
                      )}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
          {image ? (
            <div className="hidden w-1/2 items-center justify-center self-stretch sm:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-56 w-full animate-float-y object-cover motion-reduce:animate-none"
              />
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

function ProductGridSection({
  title,
  subtitle,
  products,
  cta = 'Explore all products',
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  cta?: string;
}) {
  const layout = useLayout();

  if (products.length === 0) return null;

  return (
    <section className={cn(layout.container, layout.sectionPadding)}>
      <SectionTitle title={title} subtitle={subtitle} />
      <RevealGroup className={cn('grid', layout.grid, layout.gridGap)}>
        {products.map((p, i) => (
          <RevealItem key={p.id}>
            <ProductCard product={p} priority={i < 4} />
          </RevealItem>
        ))}
      </RevealGroup>
      <div className="mt-10 text-center">
        <CtaButton href="/products">{cta}</CtaButton>
      </div>
    </section>
  );
}

function NewArrivals() {
  const { data } = useStorefrontProducts({ page: 1, sort: 'newest' });
  return (
    <ProductGridSection title="New Arrivals" products={(data?.data ?? []).slice(0, 4)} />
  );
}

/** Two image-and-copy splits — the craft story between the grids. */
function CraftStory() {
  const layout = useLayout();
  const { data } = useStorefrontProducts({ page: 1, sort: 'rating_desc' });
  const images = (data?.data ?? [])
    .map((p) => p.images?.[0]?.url)
    .filter(Boolean) as string[];

  const rows = [
    {
      title: 'Signature Compositions',
      copy: 'Every scent in our collection is created with a sense of artistry and purpose. From modern minimalism to elegant traditional styles, each composition is made to offer durability, comfort and lasting elegance — a fragrance that helps you express what feels uniquely yours.',
      image: images[0] ?? 'https://picsum.photos/seed/essence-craft-1/800/600',
      flip: false,
    },
    {
      title: 'High-End Quality',
      copy: 'We prioritise craftsmanship that lasts. Using premium ingredients and meticulous blending, each bottle is made to wear beautifully from the first spray to the final note — quality that not only lasts but elevates the everyday.',
      image: images[1] ?? 'https://picsum.photos/seed/essence-craft-2/800/600',
      flip: true,
    },
  ];

  return (
    <section className="bg-muted/50">
      <div className={cn(layout.container, 'space-y-16 py-16')}>
        {rows.map((row) => (
          <Reveal
            key={row.title}
            className={cn(
              'grid items-center gap-8 md:grid-cols-2 md:gap-14',
            )}
          >
            <div
              className={cn(
                'aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-muted',
                row.flip && 'md:order-2',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.image}
                alt=""
                aria-hidden
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className={cn(row.flip && 'md:order-1')}>
              <h2 className="font-display text-3xl font-medium sm:text-4xl">{row.title}</h2>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {row.copy}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STATS = [
  { target: 10000, suffix: '+', label: 'Happy Customers' },
  { target: 500, suffix: '+', label: 'Unique Scents' },
  { target: 16, suffix: '+', label: 'Years of Craftsmanship' },
  { target: 1500, suffix: '+', label: '5-Star Reviews' },
];

/** Counts up from zero the first time it scrolls into view. */
function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, target]);

  return (
    <span ref={ref}>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

function StatsBand() {
  const layout = useLayout();
  return (
    <section className="bg-primary text-primary-foreground">
      <div
        className={cn(
          layout.container,
          'grid grid-cols-2 gap-8 py-12 text-center md:grid-cols-4',
        )}
      >
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="font-display text-3xl font-semibold sm:text-4xl">
              <CountUp target={stat.target} suffix={stat.suffix} />
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/75">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedGrid({ section }: { section: HomepageSection }) {
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
    <ProductGridSection
      title={section.title || 'Most popular'}
      subtitle={
        (cfg.subtitle as string) ||
        'A curated selection of our most-loved pieces, chosen for their style, charm and everyday appeal.'
      }
      products={orderedProducts.slice(0, 8)}
    />
  );
}

/** Initials avatar — testimonials carry no photos. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
      {initials || '★'}
    </span>
  );
}

function TestimonialCards({ section }: { section: HomepageSection }) {
  const layout = useLayout();
  const items = Array.isArray(section.config?.items)
    ? (section.config.items as Testimonial[])
    : [];

  if (items.length === 0) return null;

  return (
    <section className={cn(layout.container, layout.sectionPadding)}>
      <Reveal className="mb-10 text-center">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          This is what makes us different
        </h2>
        <p className="mt-1 font-display text-2xl text-muted-foreground sm:text-3xl">
          {section.title || 'Hear from our customers.'}
        </p>
      </Reveal>
      <RevealGroup className="grid gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <RevealItem key={i}>
            <figure className="flex h-full flex-col gap-4 rounded-[var(--radius)] border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-md motion-reduce:transform-none">
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <Avatar name={t.author} />
                <span className="text-sm font-semibold">
                  {t.author}
                  {t.location ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {t.location}
                    </span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

/** Mint "Follow @brand" band over an edge-to-edge product gallery. */
function InstagramStrip() {
  const { name } = useTheme();
  const { data } = useStorefrontProducts({ page: 1, sort: 'newest' });
  const tiles = (data?.data ?? []).filter((p) => p.images?.[0]?.url).slice(0, 6);

  if (tiles.length < 3) return null;

  const handle = name.toLowerCase().replace(/\s+/g, '');

  return (
    <section aria-label={`Follow @${handle}`}>
      <div className="bg-secondary py-10 text-center text-secondary-foreground">
        <Instagram className="mx-auto h-6 w-6" aria-hidden />
        <p className="mt-2 font-display text-2xl font-medium">Follow @{handle}</p>
        <p className="mt-1 text-sm text-secondary-foreground/70">
          Follow us on Instagram for daily inspiration and new arrivals.
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
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-300 group-hover:bg-ink/40 group-hover:opacity-100">
              <Instagram className="h-5 w-5 text-white" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const BENEFITS = [
  {
    Icon: Truck,
    title: 'Free Shipping',
    copy: 'Enjoy fast, hassle-free delivery on every order.',
  },
  {
    Icon: RotateCcw,
    title: '30 Days Return',
    copy: 'Shop confidently with our easy return policy.',
  },
  {
    Icon: BadgePercent,
    title: 'Best Offers',
    copy: 'Premium fragrance at the most attractive prices.',
  },
  {
    Icon: ShieldCheck,
    title: 'Secure Payment',
    copy: 'Payments are protected with advanced security.',
  },
];

function BenefitsRow() {
  const layout = useLayout();
  return (
    <section className="bg-muted/50">
      <div className={cn(layout.container, 'grid grid-cols-2 gap-4 py-12 md:grid-cols-4')}>
        {BENEFITS.map(({ Icon, title, copy }) => (
          <div
            key={title}
            className="group rounded-[var(--radius)] bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none"
          >
            <Icon
              className="mx-auto h-6 w-6 text-brand transition-transform duration-300 group-hover:scale-110"
              aria-hidden
            />
            <p className="mt-3 font-display text-lg font-medium">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionRenderer({ section }: { section: HomepageSection }) {
  const cfg = section.config ?? {};

  switch (section.type) {
    case 'hero_banner': {
      const slides = Array.isArray(cfg.slides) ? (cfg.slides as HeroSlide[]) : [];
      const slide: HeroSlide = slides[0] ?? {
        heading: section.title || (cfg.heading as string) || 'Welcome',
        subheading: cfg.subheading as string | undefined,
        ctaLabel: (cfg.ctaLabel as string) || 'Shop now',
        ctaHref: (cfg.ctaHref as string) || '/products',
        image: cfg.image as string | undefined,
      };
      return (
        <>
          <OverlayHero slide={slide} />
          <ExploreTiles />
        </>
      );
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
      return <TestimonialCards section={section} />;

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
    <section className="bg-secondary/50 py-28 text-center">
      <div className="container space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-brand">The house of</p>
        <h1 className="font-display text-5xl font-medium tracking-tight">{name}</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          The homepage tells its story from sections in the admin builder. Add a
          hero and a featured rail, or step into the collection.
        </p>
        <Button asChild>
          <Link href="/products">Shop all products</Link>
        </Button>
      </div>
    </section>
  );
}

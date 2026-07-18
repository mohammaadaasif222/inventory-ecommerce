'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import { useStorefrontProducts } from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * About page — the brand story told in the shared design language: mint hero,
 * wide banner, who-we-are and mission splits, a founder card on the brand
 * colour, and a product gallery. Styled entirely from theme tokens so every
 * theme renders it in its own palette.
 */
export default function AboutPage() {
  const layout = useLayout();
  const { name } = useTheme();

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="bg-secondary py-16 text-center text-secondary-foreground sm:py-20">
        <Reveal className={cn(layout.container, 'space-y-3')}>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Scent Is What You Make It
          </h1>
          <p className="mx-auto max-w-xl text-sm text-secondary-foreground/75">
            Bringing character, memory and quiet luxury to every day — one
            composition at a time.
          </p>
        </Reveal>
      </section>

      {/* ── Wide banner ── */}
      <section className={cn(layout.container, 'py-10')}>
        <Reveal className="overflow-hidden rounded-[var(--radius)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/essence-about-banner/1400/520"
            alt=""
            aria-hidden
            className="h-64 w-full object-cover sm:h-80"
          />
        </Reveal>
      </section>

      {/* ── Who we are ── */}
      <section className={cn(layout.container, 'py-10')}>
        <Reveal className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/essence-about-who/800/600"
              alt=""
              aria-hidden
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Who We Are</h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
              We are a passionate fragrance house dedicated to creating scents
              that feel alive, warm and beautifully composed. With a love for
              rare ingredients, craftsmanship and thoughtful design, we offer
              compositions that blend classic perfumery with modern character.
              Our collection is inspired by earthy textures, timeless
              aesthetics and the joy of finding a scent that feels unmistakably
              yours.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Our mission ── */}
      <section className={cn(layout.container, 'py-10')}>
        <Reveal className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="md:order-2">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius)] bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://picsum.photos/seed/essence-about-mission/800/600"
                alt=""
                aria-hidden
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="md:order-1">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Our Mission</h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Our mission is to help you find a fragrance that reflects your
              personality and your connection to the moments that matter. We
              aim to provide high-quality, inspiring scents that bring balance,
              beauty and creativity into everyday living. By focusing on
              sustainable sourcing, elegant design and customer delight, we
              strive to make discovering fragrance effortless and meaningful —
              day and night.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ── Founder ── */}
      <section className={cn(layout.container, 'py-10')}>
        <Reveal className="grid overflow-hidden rounded-[var(--radius)] md:grid-cols-[2fr_3fr]">
          <div className="aspect-[4/3] bg-muted md:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/essence-about-founder/700/700"
              alt="Portrait of the founder"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="bg-primary p-8 text-primary-foreground sm:p-12">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/70">
              Founder
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
              Elizabeth Harris
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-primary-foreground/85">
              Our founder is a passionate creator who believes a signature
              scent starts with meaningful details. With an eye for design and
              a love for craftsmanship, they built this house to bring
              thoughtfully composed fragrance to every wardrobe.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Youtube, label: 'YouTube' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/15 transition-colors hover:bg-primary-foreground hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <GalleryStrip name={name} />
    </div>
  );
}

/** Mint follow band over an edge-to-edge product gallery, as on the home page. */
function GalleryStrip({ name }: { name: string }) {
  const { data } = useStorefrontProducts({ page: 1, sort: 'newest' });
  const tiles = (data?.data ?? []).filter((p) => p.images?.[0]?.url).slice(0, 6);

  if (tiles.length < 3) return null;

  const handle = name.toLowerCase().replace(/\s+/g, '');

  return (
    <section aria-label={`Follow @${handle}`} className="pt-6">
      <div className="bg-secondary py-10 text-center text-secondary-foreground">
        <Instagram className="mx-auto h-6 w-6" aria-hidden />
        <p className="mt-2 font-display text-2xl font-medium">Follow @{handle}</p>
        <p className="mt-1 text-sm text-secondary-foreground/70">
          Follow us on Instagram for daily inspiration and new arrivals.
        </p>
      </div>
      <RevealGroup className="grid grid-cols-3 sm:grid-cols-6">
        {tiles.map((product) => (
          <RevealItem key={product.id}>
            <Link
              href={`/products/${product.slug}`}
              aria-label={product.name}
              className="group relative block aspect-square overflow-hidden"
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
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

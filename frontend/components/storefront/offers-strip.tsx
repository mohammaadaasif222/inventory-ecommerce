'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOffers, type Offer } from '@/hooks/use-coupons';
import { RevealGroup, RevealItem, SectionHeading } from './motion';
import { cn } from '@/lib/utils';

function offerHeadline(o: Offer): string {
  if (o.type === 'PERCENT') return `${o.value}% off`;
  if (o.type === 'FIXED') return `₹${o.value} off`;
  return 'Free shipping';
}

function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      setCopied(true);
      toast.success(`Code ${offer.code} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated; show the code rather than fail silently.
      toast(`Use code ${offer.code} at checkout`, { icon: "🏷️" });
    }
  };

  return (
    <RevealItem>
      <motion.button
        type="button"
        onClick={copy}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        className="group flex h-full w-full flex-col items-start gap-1.5 rounded-sm border border-dashed border-brand/50 bg-card p-4 text-left transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-brand">
          <Tag className="h-3 w-3" />
          {offerHeadline(offer)}
        </span>
        <span className="font-display text-xl font-medium">{offer.code}</span>
        {offer.description ? (
          <span className="text-xs text-muted-foreground">
            {offer.description}
          </span>
        ) : null}
        <span
          className={cn(
            'mt-auto flex items-center gap-1 pt-2 text-[11px] font-medium transition-colors',
            copied ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Tap to copy
            </>
          )}
        </span>
      </motion.button>
    </RevealItem>
  );
}

export function OffersStrip() {
  const { data: offers } = useOffers();
  if (!offers || offers.length === 0) return null;

  return (
    <section className="container py-16">
      <SectionHeading
        title="Offers"
        subtitle="Apply at checkout"
        className="mb-8"
      />
      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o) => (
          <OfferCard key={o.code} offer={o} />
        ))}
      </RevealGroup>
    </section>
  );
}

'use client';

import { Quote } from 'lucide-react';
import { RevealGroup, RevealItem, SectionHeading } from './motion';

export interface Testimonial {
  quote: string;
  author: string;
  location?: string;
}

export function Testimonials({
  title,
  items,
}: {
  title: string;
  items: Testimonial[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="bg-secondary/60 py-16">
      <div className="container">
        <SectionHeading title={title} className="mb-10" />
        <RevealGroup className="grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <RevealItem key={i}>
              <figure className="flex h-full flex-col gap-4 rounded-sm bg-card p-6">
                <Quote className="h-5 w-5 shrink-0 text-brand" />
                <blockquote className="flex-1 font-display text-lg leading-relaxed">
                  “{t.quote}”
                </blockquote>
                <figcaption className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t.author}
                  {t.location ? ` · ${t.location}` : ''}
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

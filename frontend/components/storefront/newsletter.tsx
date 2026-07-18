'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reveal } from './motion';

/**
 * Newsletter capture. There is no subscriber endpoint in the backend yet, so
 * this validates and acknowledges locally rather than pretending to persist.
 */
export function Newsletter({ title, text }: { title: string; text?: string }) {
  const [email, setEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setEmail('');
    toast.success('Thanks — we’ll be in touch');
  };

  return (
    <section className="border-t py-16">
      <Reveal className="container flex flex-col items-center gap-5 text-center">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-medium">{title}</h2>
          {text ? (
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {text}
            </p>
          ) : null}
        </div>
        <form onSubmit={submit} className="flex w-full max-w-sm gap-2">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" className="shrink-0">
            Subscribe
          </Button>
        </form>
      </Reveal>
    </section>
  );
}

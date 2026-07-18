'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MessageCircle,
  PackageSearch,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/hooks/use-tickets';

const CHANNELS = [
  {
    Icon: MessageCircle,
    title: 'Live Chat',
    copy: 'Fastest answers — start a chat from the bubble at the bottom right.',
    href: null,
  },
  {
    Icon: HelpCircle,
    title: 'Help Center',
    copy: 'Guides on delivery, returns and caring for your fragrance.',
    href: '/help',
  },
  {
    Icon: PackageSearch,
    title: 'Track Order',
    copy: 'See where your order is, from atelier to doorstep.',
    href: '/track',
  },
] as const;

/**
 * Contact page — channel cards beside a message form.
 *
 * The form files a real support ticket: signed-in visitors through the
 * authenticated endpoint, guests through the public email-ingest one (the
 * same door inbound mail arrives through), so everything lands in the same
 * admin ticket queue.
 */
export default function ContactPage() {
  const layout = useLayout();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState<Ticket | null>(null);

  const submit = useMutation({
    mutationFn: async (): Promise<Ticket> => {
      if (user) {
        return api.post<Ticket>('/tickets', {
          subject,
          description: message,
        });
      }
      return api.post<Ticket>('/tickets/ingest/email', {
        from: email.trim(),
        subject: name.trim() ? `${subject} — ${name.trim()}` : subject,
        body: message,
      });
    },
    onSuccess: (ticket) => {
      setCreated(ticket);
      setSubject('');
      setMessage('');
      toast.success('Message sent');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Add a subject and a message');
      return;
    }
    if (!user && !/.+@.+\..+/.test(email.trim())) {
      toast.error('Enter a valid email so we can reply');
      return;
    }
    submit.mutate();
  };

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="bg-secondary py-16 text-center text-secondary-foreground sm:py-20">
        <Reveal className={cn(layout.container, 'space-y-3')}>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            We&apos;d Love to Hear From You
          </h1>
          <p className="mx-auto max-w-xl text-sm text-secondary-foreground/75">
            Questions about a scent, an order or anything in between — send a
            note and we&apos;ll reply within one working day.
          </p>
        </Reveal>
      </section>

      <section className={cn(layout.container, 'grid gap-8 py-12 lg:grid-cols-[1fr_1.4fr]')}>
        {/* ── Channels ── */}
        <RevealGroup className="space-y-4 self-start">
          {CHANNELS.map(({ Icon, title, copy, href }) => {
            const card = (
              <div className="group flex h-full items-start gap-4 rounded-[var(--radius)] border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-md motion-reduce:transform-none">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="flex items-center gap-1.5 font-display text-lg font-medium">
                    {title}
                    {href && (
                      <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{copy}</span>
                </span>
              </div>
            );
            return (
              <RevealItem key={title}>
                {href ? <Link href={href}>{card}</Link> : card}
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* ── Form ── */}
        <Reveal>
          <div className="rounded-[var(--radius)] border bg-card p-6 sm:p-8">
            {created ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-brand" />
                <p className="font-display text-2xl font-medium">Message received</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Your ticket{' '}
                  <span className="font-semibold text-foreground">
                    {created.ticketNumber}
                  </span>{' '}
                  is with our team — we&apos;ll get back to you
                  {user ? ' in your account inbox' : ' by email'} shortly.
                </p>
                <Button variant="outline" size="sm" onClick={() => setCreated(null)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <h2 className="font-display text-2xl font-medium">Send a message</h2>

                {!user && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-name" className="text-xs text-muted-foreground">
                        Your name
                      </label>
                      <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Aanya Kapoor"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="contact-email" className="text-xs text-muted-foreground">
                        Email *
                      </label>
                      <Input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="contact-subject" className="text-xs text-muted-foreground">
                    Subject *
                  </label>
                  <Input
                    id="contact-subject"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Question about an order"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="text-xs text-muted-foreground">
                    Message *
                  </label>
                  <Textarea
                    id="contact-message"
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us how we can help…"
                  />
                </div>

                <Button type="submit" disabled={submit.isPending} className="w-full sm:w-auto sm:px-10">
                  {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send message
                </Button>
                {user ? (
                  <p className="text-xs text-muted-foreground">
                    Sending as {user.email} — replies land in your account.
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}

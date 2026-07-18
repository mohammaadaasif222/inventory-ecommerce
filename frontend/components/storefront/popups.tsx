'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useActivePopups, type Popup } from '@/hooks/use-website';

const seenKey = (id: string) => `popup_seen_${id}`;
const dismissKey = (id: string) => `popup_dismissed_${id}`;
const consentKey = (id: string) => `popup_consent_${id}`;

function seenCount(id: string): number {
  return Number(window.localStorage.getItem(seenKey(id)) ?? 0);
}

function markSeen(id: string) {
  window.localStorage.setItem(seenKey(id), String(seenCount(id) + 1));
}

/** frequencyCap 0 / unset means unlimited. */
function underCap(popup: Popup): boolean {
  const cap = popup.displayRules?.frequencyCap ?? 0;
  return cap <= 0 || seenCount(popup._id) < cap;
}

/** CTA that routes internally for `/paths` and opens a new tab otherwise. */
function CtaButton({
  popup,
  size = 'sm',
  onNavigate,
}: {
  popup: Popup;
  size?: 'sm' | 'default';
  onNavigate?: () => void;
}) {
  const { buttonLabel, buttonUrl } = popup.content ?? {};
  if (!buttonUrl) return null;
  const label = buttonLabel || 'Learn more';
  if (buttonUrl.startsWith('/')) {
    return (
      <Button asChild size={size} onClick={onNavigate}>
        <Link href={buttonUrl}>{label}</Link>
      </Button>
    );
  }
  return (
    <Button asChild size={size} onClick={onNavigate}>
      <a href={buttonUrl} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  );
}

/**
 * Top bar. With a banner image it renders the image full-bleed (clickable when
 * a link is set); otherwise a text strip with message and optional button.
 */
function AnnouncementBar({
  popup,
  onDismiss,
}: {
  popup: Popup;
  onDismiss: () => void;
}) {
  const { message, imageUrl, buttonUrl } = popup.content ?? {};
  const text = message || popup.title;

  if (imageUrl) {
    /* eslint-disable @next/next/no-img-element */
    const img = (
      <img
        src={imageUrl}
        alt={text}
        className="max-h-28 w-full object-cover"
      />
    );
    /* eslint-enable @next/next/no-img-element */
    return (
      <div className="relative">
        {buttonUrl ? (
          buttonUrl.startsWith('/') ? (
            <Link href={buttonUrl} aria-label={text}>{img}</Link>
          ) : (
            <a href={buttonUrl} target="_blank" rel="noopener noreferrer" aria-label={text}>
              {img}
            </a>
          )
        ) : (
          img
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-foreground px-10 py-2 text-center text-sm text-background">
      <span>{text}</span>
      <CtaButton popup={popup} />
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Timed / exit-intent modal with banner image, message and CTA. */
function PopupModal({ popup }: { popup: Popup }) {
  const [open, setOpen] = useState(false);
  const triggered = useRef(false);
  const rules = popup.displayRules ?? {};

  useEffect(() => {
    if (!underCap(popup)) return;

    const show = () => {
      if (triggered.current) return;
      triggered.current = true;
      markSeen(popup._id);
      setOpen(true);
    };

    if (popup.type === 'exit_intent') {
      const onLeave = (e: MouseEvent) => {
        if (!e.relatedTarget && e.clientY <= 0) show();
      };
      document.addEventListener('mouseout', onLeave);
      return () => document.removeEventListener('mouseout', onLeave);
    }

    if (rules.scrollPercent && rules.scrollPercent > 0) {
      const onScroll = () => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
        if (pct >= (rules.scrollPercent as number)) show();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const timer = setTimeout(show, (rules.delaySeconds ?? 3) * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup._id]);

  const { message, imageUrl } = popup.content ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md overflow-hidden p-0"
        aria-describedby={undefined}
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="max-h-56 w-full object-cover" />
        )}
        <div className="space-y-3 p-6 pt-2 text-center">
          <DialogTitle className="text-xl">{popup.title || 'Special offer'}</DialogTitle>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <CtaButton popup={popup} size="default" onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bottom consent bar; the choice is remembered permanently per popup. */
function CookieConsent({ popup }: { popup: Popup }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(consentKey(popup._id))) setVisible(true);
  }, [popup._id]);

  if (!visible) return null;

  const decide = (choice: 'accepted' | 'dismissed') => {
    window.localStorage.setItem(consentKey(popup._id), choice);
    setVisible(false);
  };

  const { message } = popup.content ?? {};

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-lg border bg-background p-4 shadow-lg sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {message || popup.title || 'We use cookies to improve your experience.'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <CtaButton popup={popup} />
        <Button size="sm" onClick={() => decide('accepted')}>Accept</Button>
        <Button size="sm" variant="outline" onClick={() => decide('dismissed')}>
          Decline
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders every active popup for the current path: announcement bars stack at
 * the top of the page (this component mounts above the header), one modal at a
 * time, and the cookie-consent bar floats at the bottom.
 */
export function StorefrontPopups() {
  const pathname = usePathname();
  const { data: popups } = useActivePopups(pathname || '/');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Session-dismissed bars stay hidden until the tab is closed.
  useEffect(() => {
    if (!popups) return;
    const hidden = new Set<string>();
    for (const p of popups) {
      if (window.sessionStorage.getItem(dismissKey(p._id))) hidden.add(p._id);
    }
    setDismissed(hidden);
  }, [popups]);

  if (!popups || popups.length === 0) return null;

  const dismiss = (id: string) => {
    window.sessionStorage.setItem(dismissKey(id), '1');
    setDismissed((prev) => new Set(prev).add(id));
  };

  const bars = popups.filter(
    (p) => p.type === 'announcement_bar' && !dismissed.has(p._id),
  );
  const modal = popups.find(
    (p) => p.type === 'timed_modal' || p.type === 'exit_intent',
  );
  const consent = popups.find((p) => p.type === 'cookie_consent');

  return (
    <>
      {bars.map((p) => (
        <div key={p._id} className="relative">
          <AnnouncementBar popup={p} onDismiss={() => dismiss(p._id)} />
        </div>
      ))}
      {modal && <PopupModal key={modal._id} popup={modal} />}
      {consent && <CookieConsent key={consent._id} popup={consent} />}
    </>
  );
}

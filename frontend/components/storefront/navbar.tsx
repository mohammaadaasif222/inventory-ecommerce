'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  LifeBuoy,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistIds } from '@/hooks/use-wishlist';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { ModeToggle } from './mode-toggle';
import { cn } from '@/lib/utils';

/** Animated count pill; pops whenever the number changes. */
function CountBadge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-brand-foreground"
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        // nowrap: the editorial header is tight and "Sign in" would break in two.
        'relative flex items-center gap-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Search that navigates to the collection — only rendered by the slim nav. */
function NavSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
      }}
      className="relative mx-4 hidden max-w-xl flex-1 md:block"
    >
      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the collection…"
        aria-label="Search products"
        className="h-8 pl-8 text-sm"
      />
    </form>
  );
}

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const { data: wishlistIds } = useWishlistIds();
  const layout = useLayout();
  // The wordmark is part of the design — it comes from the active theme, and a
  // merchant who uploads a logo in the customiser replaces it entirely.
  const { name: brandName, logoUrl } = useTheme();

  const cartCount = items.reduce((n, i) => n + i.quantity, 0);
  const wishCount = wishlistIds?.length ?? 0;

  const wordmark = (
    <Link
      href="/"
      className={cn(
        'font-display font-medium uppercase tracking-[0.2em] transition-opacity hover:opacity-70',
        layout.navbar === 'stacked' && 'text-3xl tracking-[0.3em]',
        layout.navbar === 'inline' && 'text-2xl',
        layout.navbar === 'slim' && 'text-lg tracking-[0.15em]',
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={brandName}
          className={cn(
            'w-auto object-contain',
            layout.navbar === 'stacked' && 'h-10',
            layout.navbar === 'inline' && 'h-8',
            layout.navbar === 'slim' && 'h-6',
          )}
        />
      ) : (
        brandName
      )}
    </Link>
  );

  const actions = (
    <nav
      className={cn(
        'flex items-center text-sm',
        layout.navbar === 'slim' ? 'gap-4' : 'gap-5',
      )}
    >
      {layout.navbar !== 'stacked' && (
        <>
          <NavLink href="/products">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Shop</span>
          </NavLink>
          <NavLink href="/help" className="hidden sm:flex">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </NavLink>
        </>
      )}
      <NavLink href={user ? '/account/wishlist' : '/login'}>
        <Heart className="h-4 w-4" />
        <span className={cn('hidden', layout.navbar !== 'slim' && 'sm:inline')}>
          Saved
        </span>
        <CountBadge count={wishCount} />
      </NavLink>
      <NavLink href="/cart">
        <ShoppingCart className="h-4 w-4" />
        <span className={cn('hidden', layout.navbar !== 'slim' && 'sm:inline')}>
          Cart
        </span>
        <CountBadge count={cartCount} />
      </NavLink>
      <NavLink href={user ? '/account' : '/login'}>
        <User className="h-4 w-4" />
        <span className={cn('hidden', layout.navbar !== 'slim' && 'sm:inline')}>
          {user ? 'Account' : 'Sign in'}
        </span>
      </NavLink>
      <ModeToggle className="-mr-1" />
    </nav>
  );

  // ── Editorial: centred wordmark over a second row of links ──
  if (layout.navbar === 'stacked') {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className={cn(layout.container, 'flex flex-col items-center gap-3 py-4')}>
          <div className="flex w-full items-center justify-between gap-4">
            {/* Equal flex on both sides keeps the wordmark optically centred
                without squeezing the actions into a fixed width. */}
            <span className="flex-1" aria-hidden />
            {wordmark}
            <div className="flex flex-1 justify-end">{actions}</div>
          </div>
          <nav className="flex items-center gap-8 text-xs uppercase tracking-[0.18em]">
            <Link href="/products" className="text-muted-foreground transition-colors hover:text-foreground">
              Collection
            </Link>
            <Link href="/products?sort=rating_desc" className="text-muted-foreground transition-colors hover:text-foreground">
              Best sellers
            </Link>
            <Link href="/products?sort=newest" className="text-muted-foreground transition-colors hover:text-foreground">
              New in
            </Link>
            <Link href="/help" className="text-muted-foreground transition-colors hover:text-foreground">
              Help
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  // ── Compact: slim bar with the search inline ──
  if (layout.navbar === 'slim') {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
        <div className={cn(layout.container, 'flex h-12 items-center')}>
          {wordmark}
          <NavSearch />
          <div className="ml-auto">{actions}</div>
        </div>
      </header>
    );
  }

  // ── Classic: wordmark left, actions right ──
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className={cn(layout.container, 'flex h-16 items-center justify-between')}>
        {wordmark}
        {actions}
      </div>
    </header>
  );
}

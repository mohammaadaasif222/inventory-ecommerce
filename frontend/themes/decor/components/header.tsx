'use client';

import Link from 'next/link';
import { Heart, Lamp, Search, ShoppingBag, User } from 'lucide-react';
import { ModeToggle } from '@/components/storefront/mode-toggle';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useCatalogScope } from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * Hearth header — two-deck: brand row with utility icons above a centred
 * room-navigation bar built from the scope's child categories ("Living Room",
 * "Bedroom", …). Structurally unlike Essence's single row or the shared
 * Navbar, which is the point of a theme slot.
 */
export default function DecorHeader() {
  const layout = useLayout();
  const { name: brandName, logoUrl } = useTheme();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const scope = useCatalogScope();

  const cartCount = items.reduce((n, i) => n + i.quantity, 0);
  const rooms = scope.children.slice(0, 5);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-md">
      <div className={cn(layout.container, 'flex h-16 items-center justify-between gap-4')}>
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
          ) : (
            <>
              <Lamp className="h-6 w-6 text-brand" aria-hidden />
              {brandName}
            </>
          )}
        </Link>

        <div className="flex items-center gap-4 text-foreground/80">
          <Link href="/search" aria-label="Search" className="transition-colors hover:text-brand">
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href={user ? '/account/wishlist' : '/login'}
            aria-label="Wishlist"
            className="hidden transition-colors hover:text-brand sm:block"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative transition-colors hover:text-brand">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-brand-foreground">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href={user ? '/account' : '/login'}
            aria-label={user ? 'Account' : 'Sign in'}
            className="transition-colors hover:text-brand"
          >
            <User className="h-5 w-5" />
          </Link>
          <ModeToggle />
        </div>
      </div>

      <nav
        aria-label="Rooms"
        className="hidden border-t md:block"
      >
        <div className={cn(layout.container, 'flex items-center justify-center gap-8 py-2.5 text-sm')}>
          <Link href="/products" className="font-medium transition-colors hover:text-brand">
            Shop All
          </Link>
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/products?categoryId=${room.id}`}
              className="text-foreground/70 transition-colors hover:text-brand"
            >
              {room.name}
            </Link>
          ))}
          <Link href="/blog" className="text-foreground/70 transition-colors hover:text-brand">
            Journal
          </Link>
          <Link href="/about" className="text-foreground/70 transition-colors hover:text-brand">
            About
          </Link>
          <Link href="/contact" className="text-foreground/70 transition-colors hover:text-brand">
            Contact
          </Link>
        </div>
      </nav>
    </header>
  );
}

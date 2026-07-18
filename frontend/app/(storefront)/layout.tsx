import { ReactNode } from 'react';
import { Navbar } from '@/components/storefront/navbar';
import { CartSync } from '@/components/storefront/cart-sync';
import { StoreFooter } from '@/components/storefront/footer';
import { StorefrontPopups } from '@/components/storefront/popups';
import { ChatWidget } from '@/components/chat/chat-widget';
import { ThemeRuntime } from '@/themes/runtime/theme-runtime';
import { applyCustomizations } from '@/themes/config';
import { getThemeConfigSafe, resolveSlot } from '@/themes/resolver';
import { getActiveTheme } from '@/lib/active-theme';
import { storefrontLayoutMetadata } from '@/lib/seo';

/** Shop name as the default title; the customiser's favicon storefront-wide. */
export function generateMetadata() {
  return storefrontLayoutMetadata();
}

/**
 * The storefront shell — and the only place a theme is resolved.
 *
 * Resolution happens here, server-side, so the first byte already carries the
 * active theme's tokens: no default-then-swap flash, and crawlers see the
 * themed markup. The API caches the active slug in Redis, so this costs one
 * cheap hop rather than a database read per request.
 *
 * Header and footer resolve through the slot system: a theme that ships
 * `components/header.tsx` or `components/footer.tsx` replaces the core chrome
 * wholesale; one that doesn't inherits the shared Navbar/StoreFooter, which
 * already restyle themselves from the theme's tokens and layout.
 *
 * Note what this file does *not* import: any theme. It asks the resolver for
 * whatever is active and hands the result to the runtime. Adding a sixth theme
 * changes nothing here.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  const active = await getActiveTheme();
  const theme = applyCustomizations(
    getThemeConfigSafe(active.slug),
    active.customizations,
  );

  const [Header, Footer] = await Promise.all([
    resolveSlot(active.slug, 'header'),
    resolveSlot(active.slug, 'footer'),
  ]);

  return (
    <ThemeRuntime theme={theme}>
      <StorefrontPopups />
      {Header ? <Header /> : <Navbar />}
      <main className="flex-1">{children}</main>
      {Footer ? <Footer /> : <StoreFooter />}
      <CartSync />
      <ChatWidget />
    </ThemeRuntime>
  );
}

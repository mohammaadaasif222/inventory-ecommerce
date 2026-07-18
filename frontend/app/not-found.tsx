import { Navbar } from '@/components/storefront/navbar';
import { StoreFooter } from '@/components/storefront/footer';
import { ThemeRuntime } from '@/themes/runtime/theme-runtime';
import { applyCustomizations } from '@/themes/config';
import {
  getThemeConfigSafe,
  resolveSlot,
  resolveTemplate,
} from '@/themes/resolver';
import { getActiveTheme } from '@/lib/active-theme';

/**
 * Root 404 — the one an unmatched URL actually reaches.
 *
 * Next only renders a route group's `not-found.tsx` for `notFound()` calls
 * *inside* that segment; a URL matching no route at all falls here, outside
 * `(storefront)` and therefore outside its layout. So this file rebuilds the
 * storefront shell itself rather than inheriting it — otherwise the most likely
 * 404 a shopper hits would be the one page in the shop with no theme on it.
 *
 * The duplication with `(storefront)/layout.tsx` is deliberate and small. The
 * alternative — moving every storefront route up a level to share one layout —
 * would drag the admin panel under the storefront shell too.
 */
export default async function RootNotFound() {
  const active = await getActiveTheme();
  const theme = applyCustomizations(
    getThemeConfigSafe(active.slug),
    active.customizations,
  );
  const [Template, Header, Footer] = await Promise.all([
    resolveTemplate(active.slug, 'not-found'),
    resolveSlot(active.slug, 'header'),
    resolveSlot(active.slug, 'footer'),
  ]);

  return (
    <ThemeRuntime theme={theme}>
      {Header ? <Header /> : <Navbar />}
      <main className="flex-1">
        <Template />
      </main>
      {Footer ? <Footer /> : <StoreFooter />}
    </ThemeRuntime>
  );
}
